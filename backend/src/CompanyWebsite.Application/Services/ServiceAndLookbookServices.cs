using CompanyWebsite.Application.Abstractions;
using CompanyWebsite.Application.Common;
using CompanyWebsite.Application.Dtos;
using Microsoft.EntityFrameworkCore;

namespace CompanyWebsite.Application.Services;

/// <summary>Read side for the atelier's services.</summary>
public interface IServiceCatalog
{
    Task<IReadOnlyList<ServiceSummaryDto>> GetAllAsync(CancellationToken ct);
    Task<ServiceDetailDto> GetBySlugAsync(string slug, CancellationToken ct);
}

public sealed class ServiceCatalog(IApplicationDbContext db) : IServiceCatalog
{
    public async Task<IReadOnlyList<ServiceSummaryDto>> GetAllAsync(CancellationToken ct)
    {
        var services = await db.Services
            .AsNoTracking()
            .Include(s => s.Benefits)
            .Where(s => s.IsPublished)
            .OrderBy(s => s.SortOrder)
            .ToListAsync(ct);

        return services.Select(s => new ServiceSummaryDto(
            s.Id, s.Slug, s.Title, s.Summary, s.ImageUrl, s.ImageAlt,
            s.Benefits.OrderBy(b => b.SortOrder).Select(b => b.Text).ToList(),
            s.IsDemo)).ToList();
    }

    public async Task<ServiceDetailDto> GetBySlugAsync(string slug, CancellationToken ct)
    {
        var s = await db.Services
            .AsNoTracking()
            .Include(x => x.Benefits)
            .FirstOrDefaultAsync(x => x.Slug == slug && x.IsPublished, ct)
            ?? throw new NotFoundException("Service", slug);

        return new ServiceDetailDto(
            s.Id, s.Slug, s.Title, s.Summary, s.Description, s.ImageUrl, s.ImageAlt,
            s.Benefits.OrderBy(b => b.SortOrder).Select(b => b.Text).ToList(),
            s.MetaTitle, s.MetaDescription, s.IsDemo);
    }
}

public interface ILookbookService
{
    Task<IReadOnlyList<LookbookSummaryDto>> GetAllAsync(bool? featured, CancellationToken ct);
    Task<LookbookDetailDto> GetBySlugAsync(string slug, CancellationToken ct);
}

public sealed class LookbookService(IApplicationDbContext db) : ILookbookService
{
    public async Task<IReadOnlyList<LookbookSummaryDto>> GetAllAsync(bool? featured, CancellationToken ct)
    {
        var query = db.Lookbooks.AsNoTracking().Include(l => l.Media).Where(l => l.IsPublished);
        if (featured is true) query = query.Where(l => l.IsFeatured);

        var lookbooks = await query.OrderBy(l => l.SortOrder).ThenByDescending(l => l.Year).ToListAsync(ct);
        return lookbooks.Select(l =>
        {
            var cover = l.Media.OrderBy(m => m.SortOrder).FirstOrDefault();
            return new LookbookSummaryDto(
                l.Id, l.Slug, l.Title, l.Season, l.Year, l.Location, l.Summary,
                cover?.Url, cover?.AltText, l.Media.Count, l.IsDemo);
        }).ToList();
    }

    public async Task<LookbookDetailDto> GetBySlugAsync(string slug, CancellationToken ct)
    {
        var l = await db.Lookbooks
            .AsNoTracking()
            .Include(x => x.Media)
            .Include(x => x.Products).ThenInclude(p => p.Category)
            .Include(x => x.Products).ThenInclude(p => p.Media)
            .Include(x => x.Products).ThenInclude(p => p.Variants)
            .FirstOrDefaultAsync(x => x.Slug == slug && x.IsPublished, ct)
            ?? throw new NotFoundException("Lookbook", slug);

        return new LookbookDetailDto(
            l.Id, l.Slug, l.Title, l.Season, l.Year, l.Location, l.Summary, l.Story, l.Credits,
            l.Media.OrderBy(m => m.SortOrder).Select(m => new LookbookMediaDto(m.Url, m.AltText, m.Caption, m.Credit)).ToList(),
            l.Products.Where(p => p.IsPublished).OrderBy(p => p.SortOrder).Select(ProductService.ToSummary).ToList(),
            l.MetaTitle, l.MetaDescription, l.IsDemo);
    }
}
