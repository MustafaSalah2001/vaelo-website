using CompanyWebsite.Domain.Common;

namespace CompanyWebsite.Domain.Entities;

/// <summary>Single-row table holding the company's identity and contact details.</summary>
public class CompanyProfile : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Tagline { get; set; } = string.Empty;
    public string Headline { get; set; } = string.Empty;
    public string Introduction { get; set; } = string.Empty;
    public string Story { get; set; } = string.Empty;
    public string Mission { get; set; } = string.Empty;
    public string Vision { get; set; } = string.Empty;

    /// <summary>Values stored one per line; small, ordered and edited as a block.</summary>
    public string Values { get; set; } = string.Empty;

    public int? FoundedYear { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? AddressLine { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public string? LogoUrl { get; set; }
    public string? LinkedInUrl { get; set; }
    public string? InstagramUrl { get; set; }
    public string? YouTubeUrl { get; set; }
    public string? XUrl { get; set; }
    public bool IsDemo { get; set; }

    public ICollection<CompanyMetric> Metrics { get; set; } = new List<CompanyMetric>();
    public ICollection<CompanyMilestone> Milestones { get; set; } = new List<CompanyMilestone>();
}

public class CompanyMetric : BaseEntity
{
    public int CompanyProfileId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Suffix { get; set; }
    public int SortOrder { get; set; }
}

public class CompanyMilestone : BaseEntity
{
    public int CompanyProfileId { get; set; }
    public int Year { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

/// <summary>Key/value configuration that admins can change without a deploy (SEO defaults, flags).</summary>
public class SiteSetting : BaseEntity
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class Testimonial : BaseEntity
{
    public string AuthorName { get; set; } = string.Empty;
    public string? AuthorRole { get; set; }
    public string? CompanyName { get; set; }
    public string Quote { get; set; } = string.Empty;
    public bool IsPublished { get; set; }
    public int SortOrder { get; set; }
}

public class AdminUser : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = Enums.Roles.Admin;
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
}
