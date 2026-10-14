using System.ComponentModel.DataAnnotations;

namespace CompanyWebsite.Application.Dtos;

// Validation attributes here are the single source of truth for input rules.
// [ApiController] turns failures into a 400 ValidationProblemDetails automatically,
// and the frontend mirrors the same limits for instant feedback.

public sealed class ContactInquiryRequest
{
    [Required, StringLength(100, MinimumLength = 2)]
    public string Name { get; init; } = string.Empty;

    [Required, EmailAddress, StringLength(254)]
    public string Email { get; init; } = string.Empty;

    [Phone, StringLength(40)]
    public string? Phone { get; init; }

    [StringLength(120)]
    public string? CompanyName { get; init; }

    [Required, StringLength(150, MinimumLength = 3)]
    public string Subject { get; init; } = string.Empty;

    [Required, StringLength(4000, MinimumLength = 20)]
    public string Message { get; init; } = string.Empty;

    /// <summary>Honeypot. Hidden from people; bots fill it. Must stay empty.</summary>
    [StringLength(200)]
    public string? Website { get; init; }
}

public sealed class OrderRequestRequest
{
    /// <summary>"Reservation", "MadeToMeasure" or "Wholesale".</summary>
    [Required, StringLength(20)]
    public string Type { get; init; } = string.Empty;

    [Required, StringLength(100, MinimumLength = 2)]
    public string Name { get; init; } = string.Empty;

    [Required, EmailAddress, StringLength(254)]
    public string Email { get; init; } = string.Empty;

    [Phone, StringLength(40)]
    public string? Phone { get; init; }

    /// <summary>Required for wholesale requests (checked in the service).</summary>
    [StringLength(120)]
    public string? CompanyName { get; init; }

    [StringLength(80)]
    public string? Country { get; init; }

    [StringLength(140)]
    public string? ProductSlug { get; init; }

    [StringLength(40)]
    public string? Color { get; init; }

    [StringLength(10)]
    public string? Size { get; init; }

    [Range(1, 100_000)]
    public int? Quantity { get; init; }

    [Required, StringLength(4000, MinimumLength = 10)]
    public string Details { get; init; } = string.Empty;

    [StringLength(200)]
    public string? Website { get; init; }
}

public sealed record SubmissionResultDto(string Reference, string Message);

// ── Auth ───────────────────────────────────────────────────────────────────

public sealed class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; init; } = string.Empty;

    [Required, StringLength(200, MinimumLength = 8)]
    public string Password { get; init; } = string.Empty;
}

public sealed record LoginResponse(string Token, DateTime ExpiresAt, string DisplayName, string Role);

// ── Admin ──────────────────────────────────────────────────────────────────

public sealed class SpecificationInput
{
    [StringLength(60)] public string Group { get; init; } = "Details";
    [Required, StringLength(80)] public string Label { get; init; } = string.Empty;
    [Required, StringLength(120)] public string Value { get; init; } = string.Empty;
    [StringLength(20)] public string? Unit { get; init; }
}

public sealed class FeatureInput
{
    [Required, StringLength(120)] public string Title { get; init; } = string.Empty;
    [Required, StringLength(600)] public string Description { get; init; } = string.Empty;
}

public sealed class VariantInput
{
    [Required, StringLength(40)] public string ColorName { get; init; } = string.Empty;
    [Required, RegularExpression("^#[0-9A-Fa-f]{6}$")] public string ColorHex { get; init; } = "#000000";
    [Required, StringLength(10)] public string Size { get; init; } = string.Empty;
    [Required, StringLength(40)] public string Sku { get; init; } = string.Empty;
    [Range(0, 1_000_000)] public int Stock { get; init; }
}

public sealed class ProductUpsertRequest
{
    [Required, StringLength(140, MinimumLength = 2)]
    public string Name { get; init; } = string.Empty;

    /// <summary>Optional; generated from the name when omitted.</summary>
    [StringLength(140)]
    public string? Slug { get; init; }

    [StringLength(40)] public string? StyleCode { get; init; }

    [Required, StringLength(300, MinimumLength = 10)]
    public string Summary { get; init; } = string.Empty;

    [Required, StringLength(8000)]
    public string Description { get; init; } = string.Empty;

    [Range(typeof(decimal), "0", "1000000")]
    public decimal Price { get; init; }

    [Required, RegularExpression("^[A-Z]{3}$")]
    public string Currency { get; init; } = "USD";

    [Range(1, int.MaxValue)]
    public int CategoryId { get; init; }

    public bool IsFeatured { get; init; }
    public bool IsNew { get; init; }
    public bool IsPublished { get; init; } = true;
    public int SortOrder { get; init; }

    [StringLength(70)] public string? MetaTitle { get; init; }
    [StringLength(170)] public string? MetaDescription { get; init; }

    public List<SpecificationInput> Specifications { get; init; } = [];
    public List<FeatureInput> Features { get; init; } = [];
    public List<VariantInput> Variants { get; init; } = [];
}

public sealed record InquiryListItemDto(
    int Id,
    string Kind,
    string Reference,
    string Name,
    string Email,
    string? CompanyName,
    string Subject,
    string Status,
    DateTime CreatedAt);

public sealed class UpdateInquiryStatusRequest
{
    [Required] public string Status { get; init; } = string.Empty;
    [StringLength(2000)] public string? InternalNotes { get; init; }
}
