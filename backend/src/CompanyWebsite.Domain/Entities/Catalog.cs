using CompanyWebsite.Domain.Common;
using CompanyWebsite.Domain.Enums;

namespace CompanyWebsite.Domain.Entities;

/// <summary>Garment type: outerwear, knitwear, shirts and tees, denim, tailoring.</summary>
public class ProductCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }

    public ICollection<Product> Products { get; set; } = new List<Product>();
}

public class Product : PublishableEntity
{
    public string Name { get; set; } = string.Empty;

    /// <summary>Internal style code, e.g. "VA-OC01". Also the prefix of every variant SKU.</summary>
    public string? StyleCode { get; set; }

    public string Summary { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public decimal Price { get; set; }

    /// <summary>ISO 4217 code, e.g. "USD".</summary>
    public string Currency { get; set; } = "USD";

    public bool IsFeatured { get; set; }
    public bool IsNew { get; set; }

    public int CategoryId { get; set; }
    public ProductCategory Category { get; set; } = null!;

    /// <summary>Composition, weight, fit, origin, care: shown as a details table.</summary>
    public ICollection<ProductSpecification> Specifications { get; set; } = new List<ProductSpecification>();
    public ICollection<ProductFeature> Features { get; set; } = new List<ProductFeature>();
    public ICollection<ProductMedia> Media { get; set; } = new List<ProductMedia>();
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
    public ICollection<Lookbook> Lookbooks { get; set; } = new List<Lookbook>();
}

/// <summary>One sellable colour/size combination of a product.</summary>
public class ProductVariant : BaseEntity
{
    public int ProductId { get; set; }
    public string ColorName { get; set; } = string.Empty;

    /// <summary>Swatch colour as #RRGGBB.</summary>
    public string ColorHex { get; set; } = "#000000";

    public string Size { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int Stock { get; set; }
    public int SortOrder { get; set; }
}

public class ProductSpecification : BaseEntity
{
    public int ProductId { get; set; }
    public string Group { get; set; } = "Details";
    public string Label { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public int SortOrder { get; set; }
}

public class ProductFeature : BaseEntity
{
    public int ProductId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class ProductMedia : BaseEntity
{
    public int ProductId { get; set; }
    public MediaType Type { get; set; }
    public string Url { get; set; } = string.Empty;
    public string AltText { get; set; } = string.Empty;
    public string? Caption { get; set; }

    /// <summary>The colour this photo shows, so the product page can switch photos with the swatch. Null = any colour.</summary>
    public string? ColorName { get; set; }

    /// <summary>Photographer / source, e.g. "Unsplash". Shown in small print.</summary>
    public string? Credit { get; set; }
    public int SortOrder { get; set; }
}
