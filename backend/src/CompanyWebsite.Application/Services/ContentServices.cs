using CompanyWebsite.Application.Abstractions;
using CompanyWebsite.Application.Common;
using CompanyWebsite.Application.Dtos;
using Microsoft.EntityFrameworkCore;

namespace CompanyWebsite.Application.Services;

public interface ICompanyService
{
    Task<CompanyDto> GetAsync(CancellationToken ct);
    Task<IReadOnlyList<TestimonialDto>> GetTestimonialsAsync(CancellationToken ct);
    Task<IReadOnlyDictionary<string, string>> GetPublicSettingsAsync(CancellationToken ct);
}

public sealed class CompanyService(IApplicationDbContext db) : ICompanyService
{
    /// <summary>Only settings in these namespaces are exposed publicly; anything else stays server-side.</summary>
    private static readonly string[] PublicPrefixes = ["seo.", "site."];

    public async Task<CompanyDto> GetAsync(CancellationToken ct)
    {
        var c = await db.CompanyProfiles
            .AsNoTracking()
            .Include(x => x.Metrics)
            .Include(x => x.Milestones)
            .OrderBy(x => x.Id)
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Company profile", "default");

        var values = c.Values
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();

        return new CompanyDto(
            c.Name, c.Tagline, c.Headline, c.Introduction, c.Story, c.Mission, c.Vision,
            values, c.FoundedYear, c.LogoUrl,
            new ContactDetailsDto(c.Email, c.Phone, c.AddressLine, c.City, c.Country),
            new SocialLinksDto(c.LinkedInUrl, c.InstagramUrl, c.YouTubeUrl, c.XUrl),
            c.Metrics.OrderBy(m => m.SortOrder).Select(m => new MetricDto(m.Label, m.Value, m.Suffix)).ToList(),
            c.Milestones.OrderBy(m => m.Year).Select(m => new MilestoneDto(m.Year, m.Title, m.Description)).ToList(),
            c.IsDemo);
    }

    public async Task<IReadOnlyList<TestimonialDto>> GetTestimonialsAsync(CancellationToken ct) =>
        await db.Testimonials
            .AsNoTracking()
            .Where(t => t.IsPublished)
            .OrderBy(t => t.SortOrder)
            .Select(t => new TestimonialDto(t.Id, t.AuthorName, t.AuthorRole, t.CompanyName, t.Quote))
            .ToListAsync(ct);

    public async Task<IReadOnlyDictionary<string, string>> GetPublicSettingsAsync(CancellationToken ct)
    {
        var settings = await db.SiteSettings.AsNoTracking().ToListAsync(ct);
        return settings
            .Where(s => PublicPrefixes.Any(p => s.Key.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
            .ToDictionary(s => s.Key, s => s.Value);
    }
}
