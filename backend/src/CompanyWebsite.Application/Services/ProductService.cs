using CompanyWebsite.Application.Abstractions;
using CompanyWebsite.Application.Common;
using CompanyWebsite.Application.Dtos;
using CompanyWebsite.Domain.Entities;
using CompanyWebsite.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CompanyWebsite.Application.Services;

public interface IProductService
{
    Task<IReadOnlyList<ProductCategoryDto>> GetCategoriesAsync(CancellationToken ct);
    Task<PagedResult<ProductSummaryDto>> SearchAsync(ProductQuery query, CancellationToken ct);
    Task<ProductDetailDto> GetBySlugAsync(string slug, CancellationToken ct);
}

public sealed class ProductService(IApplicationDbContext db) : IProductService
{
    public const int MaxPageSize = 48;

    public async Task<IReadOnlyList<ProductCategoryDto>> GetCategoriesAsync(CancellationToken ct) =>
        await db.ProductCategories
            .AsNoTracking()
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .Select(c => new ProductCategoryDto(
                c.Id, c.Name, c.Slug, c.Description,
                c.Products.Count(p => p.IsPublished)))
            .ToListAsync(ct);

    public async Task<PagedResult<ProductSummaryDto>> SearchAsync(ProductQuery query, CancellationToken ct)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);

        var products = db.Products.AsNoTracking().Where(p => p.IsPublished);

        if (!string.IsNullOrWhiteSpace(query.Category))
            products = products.Where(p => p.Category.Slug == query.Category);

        if (query.Featured is true)
            products = products.Where(p => p.IsFeatured);

        if (!string.IsNullOrWhiteSpace(query.Color))
        {
            var color = query.Color.Trim().ToLower();
            products = products.Where(p => p.Variants.Any(v => v.ColorName.ToLower() == color));
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            if (term.Length > 100) term = term[..100];
            products = products.Where(p =>
                p.Name.ToLower().Contains(term) ||
                p.Summary.ToLower().Contains(term) ||
                p.Category.Name.ToLower().Contains(term) ||
                (p.StyleCode != null && p.StyleCode.ToLower().Contains(term)));
        }

        var total = await products.CountAsync(ct);

        products = query.Sort switch
        {
            "price-asc" => products.OrderBy(p => p.Price).ThenBy(p => p.Name),
            "price-desc" => products.OrderByDescending(p => p.Price).ThenBy(p => p.Name),
            "newest" => products.OrderByDescending(p => p.IsNew).ThenByDescending(p => p.CreatedAt).ThenBy(p => p.SortOrder),
            _ => products.OrderByDescending(p => p.IsFeatured).ThenBy(p => p.SortOrder).ThenBy(p => p.Name)
        };

        // The catalogue is small, so loading the page with its media and variants and mapping
        // in memory is simpler and just as fast as a projection with nested collections.
        var pageItems = await products
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(p => p.Category)
            .Include(p => p.Media)
            .Include(p => p.Variants)
            .ToListAsync(ct);

        return new PagedResult<ProductSummaryDto>(pageItems.Select(ToSummary).ToList(), page, pageSize, total);
    }

    public async Task<ProductDetailDto> GetBySlugAsync(string slug, CancellationToken ct)
    {
        var p = await db.Products
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.Specifications)
            .Include(x => x.Features)
            .Include(x => x.Media)
            .Include(x => x.Variants)
            .Include(x => x.Lookbooks)
            .FirstOrDefaultAsync(x => x.Slug == slug && x.IsPublished, ct)
            ?? throw new NotFoundException("Product", slug);

        return Map(p);
    }

    internal static IReadOnlyList<ColorDto> Colors(Product p) =>
        p.Variants
            .OrderBy(v => v.SortOrder)
            .GroupBy(v => v.ColorName)
            .Select(g => new ColorDto(g.Key, g.First().ColorHex))
            .ToList();

    internal static ProductSummaryDto ToSummary(Product p)
    {
        var images = p.Media.Where(m => m.Type == MediaType.Image).OrderBy(m => m.SortOrder).ToList();
        var cover = images.FirstOrDefault();
        var hover = images.Skip(1).FirstOrDefault();
        return new ProductSummaryDto(
            p.Id, p.Slug, p.Name, p.StyleCode, p.Summary, p.Category.Slug, p.Category.Name,
            p.Price, p.Currency, p.IsFeatured, p.IsNew,
            cover?.Url, cover?.AltText, hover?.Url,
            Colors(p), p.IsDemo);
    }

    internal static ProductDetailDto Map(Product p) => new(
        p.Id, p.Slug, p.Name, p.StyleCode, p.Summary, p.Description,
        p.Category.Slug, p.Category.Name, p.Price, p.Currency, p.IsNew,
        Colors(p),
        SizeOrder.Sort(p.Variants.Select(v => v.Size)),
        p.Variants.OrderBy(v => v.SortOrder)
            .Select(v => new VariantDto(v.ColorName, v.Size, v.Sku, v.Stock > 0)).ToList(),
        p.Specifications.OrderBy(s => s.SortOrder).Select(s => new SpecificationDto(s.Group, s.Label, s.Value, s.Unit)).ToList(),
        p.Features.OrderBy(f => f.SortOrder).Select(f => new FeatureDto(f.Title, f.Description)).ToList(),
        p.Media.OrderBy(m => m.SortOrder)
            .Select(m => new MediaDto(m.Type.ToString(), m.Url, m.AltText, m.Caption, m.ColorName, m.Credit)).ToList(),
        p.Lookbooks.Where(l => l.IsPublished).OrderBy(l => l.SortOrder)
            .Select(l => new LookbookRefDto(l.Slug, l.Title, l.Season)).ToList(),
        p.MetaTitle, p.MetaDescription, p.IsDemo);
}
