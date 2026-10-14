namespace CompanyWebsite.Application.Dtos;

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public int TotalPages => PageSize == 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}

// ── Company ────────────────────────────────────────────────────────────────

public sealed record ContactDetailsDto(string? Email, string? Phone, string? AddressLine, string? City, string? Country);

public sealed record SocialLinksDto(string? LinkedIn, string? Instagram, string? YouTube, string? X);

public sealed record MetricDto(string Label, string Value, string? Suffix);

public sealed record MilestoneDto(int Year, string Title, string Description);

public sealed record CompanyDto(
    string Name,
    string Tagline,
    string Headline,
    string Introduction,
    string Story,
    string Mission,
    string Vision,
    IReadOnlyList<string> Values,
    int? FoundedYear,
    string? LogoUrl,
    ContactDetailsDto Contact,
    SocialLinksDto Social,
    IReadOnlyList<MetricDto> Metrics,
    IReadOnlyList<MilestoneDto> Milestones,
    bool IsDemo);

public sealed record TestimonialDto(int Id, string AuthorName, string? AuthorRole, string? CompanyName, string Quote);

// ── Products ───────────────────────────────────────────────────────────────

public sealed record ProductCategoryDto(int Id, string Name, string Slug, string? Description, int ProductCount);

/// <param name="Sort">"featured" (default), "newest", "price-asc" or "price-desc".</param>
public sealed record ProductQuery(
    string? Category = null,
    string? Search = null,
    bool? Featured = null,
    string? Color = null,
    string? Sort = null,
    int Page = 1,
    int PageSize = 24);

public sealed record ColorDto(string Name, string Hex);

public sealed record ProductSummaryDto(
    int Id,
    string Slug,
    string Name,
    string? StyleCode,
    string Summary,
    string CategorySlug,
    string CategoryName,
    decimal Price,
    string Currency,
    bool IsFeatured,
    bool IsNew,
    string? ImageUrl,
    string? ImageAlt,
    string? HoverImageUrl,
    IReadOnlyList<ColorDto> Colors,
    bool IsDemo);

public sealed record SpecificationDto(string Group, string Label, string Value, string? Unit);

public sealed record FeatureDto(string Title, string Description);

public sealed record MediaDto(string Type, string Url, string AltText, string? Caption, string? ColorName, string? Credit);

public sealed record VariantDto(string ColorName, string Size, string Sku, bool InStock);

public sealed record LookbookRefDto(string Slug, string Title, string Season);

public sealed record ProductDetailDto(
    int Id,
    string Slug,
    string Name,
    string? StyleCode,
    string Summary,
    string Description,
    string CategorySlug,
    string CategoryName,
    decimal Price,
    string Currency,
    bool IsNew,
    IReadOnlyList<ColorDto> Colors,
    IReadOnlyList<string> Sizes,
    IReadOnlyList<VariantDto> Variants,
    IReadOnlyList<SpecificationDto> Specifications,
    IReadOnlyList<FeatureDto> Features,
    IReadOnlyList<MediaDto> Media,
    IReadOnlyList<LookbookRefDto> Lookbooks,
    string? MetaTitle,
    string? MetaDescription,
    bool IsDemo);

// ── Services ───────────────────────────────────────────────────────────────

public sealed record ServiceSummaryDto(
    int Id,
    string Slug,
    string Title,
    string Summary,
    string? ImageUrl,
    string? ImageAlt,
    IReadOnlyList<string> Benefits,
    bool IsDemo);

public sealed record ServiceDetailDto(
    int Id,
    string Slug,
    string Title,
    string Summary,
    string Description,
    string? ImageUrl,
    string? ImageAlt,
    IReadOnlyList<string> Benefits,
    string? MetaTitle,
    string? MetaDescription,
    bool IsDemo);

// ── Lookbooks ──────────────────────────────────────────────────────────────

public sealed record LookbookSummaryDto(
    int Id,
    string Slug,
    string Title,
    string Season,
    int Year,
    string? Location,
    string Summary,
    string? CoverUrl,
    string? CoverAlt,
    int ImageCount,
    bool IsDemo);

public sealed record LookbookMediaDto(string Url, string AltText, string? Caption, string? Credit);

public sealed record LookbookDetailDto(
    int Id,
    string Slug,
    string Title,
    string Season,
    int Year,
    string? Location,
    string Summary,
    string Story,
    string? Credits,
    IReadOnlyList<LookbookMediaDto> Media,
    IReadOnlyList<ProductSummaryDto> Products,
    string? MetaTitle,
    string? MetaDescription,
    bool IsDemo);
