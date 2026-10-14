namespace CompanyWebsite.Domain.Common;

/// <summary>Base type for every persisted entity: identity plus audit timestamps (UTC).</summary>
public abstract class BaseEntity
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Public, routable content (products, services, projects).
/// <see cref="IsDemo"/> marks seeded placeholder content so the UI can label it and admins can find it.
/// </summary>
public abstract class PublishableEntity : BaseEntity
{
    public string Slug { get; set; } = string.Empty;
    public bool IsPublished { get; set; } = true;
    public int SortOrder { get; set; }
    public bool IsDemo { get; set; }

    // SEO overrides; the frontend falls back to title/summary when these are empty.
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
}
