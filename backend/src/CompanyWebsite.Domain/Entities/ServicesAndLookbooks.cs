using CompanyWebsite.Domain.Common;
using CompanyWebsite.Domain.Enums;

namespace CompanyWebsite.Domain.Entities;

/// <summary>What the atelier offers beyond ready-to-wear: made-to-measure, repairs, wholesale, styling.</summary>
public class Service : PublishableEntity
{
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? ImageAlt { get; set; }

    public ICollection<ServiceBenefit> Benefits { get; set; } = new List<ServiceBenefit>();
}

public class ServiceBenefit : BaseEntity
{
    public int ServiceId { get; set; }
    public string Text { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

/// <summary>A seasonal campaign: an editorial story told in photographs, with the pieces it features.</summary>
public class Lookbook : PublishableEntity
{
    public string Title { get; set; } = string.Empty;

    /// <summary>e.g. "Spring/Summer 2026".</summary>
    public string Season { get; set; } = string.Empty;
    public int Year { get; set; }
    public string? Location { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string Story { get; set; } = string.Empty;
    public string? Credits { get; set; }
    public bool IsFeatured { get; set; }

    public ICollection<LookbookMedia> Media { get; set; } = new List<LookbookMedia>();
    public ICollection<Product> Products { get; set; } = new List<Product>();
}

public class LookbookMedia : BaseEntity
{
    public int LookbookId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string AltText { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public string? Credit { get; set; }
    public int SortOrder { get; set; }
}

public class ContactInquiry : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? CompanyName { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public InquiryStatus Status { get; set; } = InquiryStatus.New;
    public string? InternalNotes { get; set; }

    /// <summary>Salted SHA-256 of the client IP; enough to spot abuse without storing personal data.</summary>
    public string? SourceIpHash { get; set; }
}

/// <summary>A reservation, made-to-measure or wholesale request from the site.</summary>
public class OrderRequest : BaseEntity
{
    public OrderRequestType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? CompanyName { get; set; }
    public string? Country { get; set; }
    public int? ProductId { get; set; }
    public Product? Product { get; set; }
    public string? ColorName { get; set; }
    public string? Size { get; set; }
    public int? Quantity { get; set; }
    public string Details { get; set; } = string.Empty;
    public InquiryStatus Status { get; set; } = InquiryStatus.New;
    public string? InternalNotes { get; set; }
    public string? SourceIpHash { get; set; }
}
