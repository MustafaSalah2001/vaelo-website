using CompanyWebsite.Domain.Common;
using CompanyWebsite.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CompanyWebsite.Infrastructure.Persistence.Configurations;

internal static class ConfigurationExtensions
{
    public static void ConfigurePublishable<T>(this EntityTypeBuilder<T> b) where T : PublishableEntity
    {
        b.Property(x => x.Slug).HasMaxLength(140).IsRequired();
        b.HasIndex(x => x.Slug).IsUnique();
        b.Property(x => x.MetaTitle).HasMaxLength(70);
        b.Property(x => x.MetaDescription).HasMaxLength(170);
        b.HasIndex(x => new { x.IsPublished, x.SortOrder });
    }
}

public sealed class CompanyProfileConfiguration : IEntityTypeConfiguration<CompanyProfile>
{
    public void Configure(EntityTypeBuilder<CompanyProfile> b)
    {
        b.Property(x => x.Name).HasMaxLength(120).IsRequired();
        b.Property(x => x.Tagline).HasMaxLength(160);
        b.Property(x => x.Headline).HasMaxLength(160);
        b.Property(x => x.Introduction).HasMaxLength(1200);
        b.Property(x => x.Story).HasMaxLength(4000);
        b.Property(x => x.Mission).HasMaxLength(600);
        b.Property(x => x.Vision).HasMaxLength(600);
        b.Property(x => x.Values).HasMaxLength(1200);
        b.Property(x => x.Email).HasMaxLength(254);
        b.Property(x => x.Phone).HasMaxLength(40);
        b.Property(x => x.AddressLine).HasMaxLength(200);
        b.Property(x => x.City).HasMaxLength(100);
        b.Property(x => x.Country).HasMaxLength(100);
        foreach (var url in new[] { nameof(CompanyProfile.LogoUrl), nameof(CompanyProfile.LinkedInUrl), nameof(CompanyProfile.InstagramUrl), nameof(CompanyProfile.YouTubeUrl), nameof(CompanyProfile.XUrl) })
            b.Property(url).HasMaxLength(500);

        b.HasMany(x => x.Metrics).WithOne().HasForeignKey(m => m.CompanyProfileId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Milestones).WithOne().HasForeignKey(m => m.CompanyProfileId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class CompanyMetricConfiguration : IEntityTypeConfiguration<CompanyMetric>
{
    public void Configure(EntityTypeBuilder<CompanyMetric> b)
    {
        b.Property(x => x.Label).HasMaxLength(80).IsRequired();
        b.Property(x => x.Value).HasMaxLength(30).IsRequired();
        b.Property(x => x.Suffix).HasMaxLength(10);
    }
}

public sealed class CompanyMilestoneConfiguration : IEntityTypeConfiguration<CompanyMilestone>
{
    public void Configure(EntityTypeBuilder<CompanyMilestone> b)
    {
        b.Property(x => x.Title).HasMaxLength(120).IsRequired();
        b.Property(x => x.Description).HasMaxLength(600);
        b.HasIndex(x => new { x.CompanyProfileId, x.Year });
    }
}

public sealed class SiteSettingConfiguration : IEntityTypeConfiguration<SiteSetting>
{
    public void Configure(EntityTypeBuilder<SiteSetting> b)
    {
        b.Property(x => x.Key).HasMaxLength(100).IsRequired();
        b.HasIndex(x => x.Key).IsUnique();
        b.Property(x => x.Value).HasMaxLength(2000);
        b.Property(x => x.Description).HasMaxLength(300);
    }
}

public sealed class TestimonialConfiguration : IEntityTypeConfiguration<Testimonial>
{
    public void Configure(EntityTypeBuilder<Testimonial> b)
    {
        b.Property(x => x.AuthorName).HasMaxLength(100).IsRequired();
        b.Property(x => x.AuthorRole).HasMaxLength(100);
        b.Property(x => x.CompanyName).HasMaxLength(120);
        b.Property(x => x.Quote).HasMaxLength(1000).IsRequired();
        b.HasIndex(x => new { x.IsPublished, x.SortOrder });
    }
}

public sealed class AdminUserConfiguration : IEntityTypeConfiguration<AdminUser>
{
    public void Configure(EntityTypeBuilder<AdminUser> b)
    {
        b.Property(x => x.Email).HasMaxLength(254).IsRequired();
        b.HasIndex(x => x.Email).IsUnique();
        b.Property(x => x.DisplayName).HasMaxLength(100).IsRequired();
        b.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
        b.Property(x => x.Role).HasMaxLength(30).IsRequired();
    }
}

public sealed class ProductCategoryConfiguration : IEntityTypeConfiguration<ProductCategory>
{
    public void Configure(EntityTypeBuilder<ProductCategory> b)
    {
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.Property(x => x.Slug).HasMaxLength(100).IsRequired();
        b.HasIndex(x => x.Slug).IsUnique();
        b.Property(x => x.Description).HasMaxLength(500);
    }
}

public sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> b)
    {
        b.ConfigurePublishable();
        b.Property(x => x.Name).HasMaxLength(140).IsRequired();
        b.Property(x => x.StyleCode).HasMaxLength(40);
        b.Property(x => x.Summary).HasMaxLength(300).IsRequired();
        b.Property(x => x.Description).HasMaxLength(8000);
        b.Property(x => x.Price).HasPrecision(10, 2);
        b.Property(x => x.Currency).HasMaxLength(3).IsFixedLength().IsRequired();
        b.ToTable(t => t.HasCheckConstraint("CK_Products_Price", "[Price] >= 0"));

        // Deleting a category that still has products is refused, never cascaded.
        b.HasOne(x => x.Category).WithMany(c => c.Products).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
        b.HasIndex(x => new { x.CategoryId, x.IsPublished, x.SortOrder });
        b.HasIndex(x => x.IsFeatured);
        b.HasIndex(x => x.Price);

        b.HasMany(x => x.Specifications).WithOne().HasForeignKey(s => s.ProductId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Features).WithOne().HasForeignKey(f => f.ProductId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Media).WithOne().HasForeignKey(m => m.ProductId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Variants).WithOne().HasForeignKey(v => v.ProductId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ProductVariantConfiguration : IEntityTypeConfiguration<ProductVariant>
{
    public void Configure(EntityTypeBuilder<ProductVariant> b)
    {
        b.Property(x => x.ColorName).HasMaxLength(40).IsRequired();
        b.Property(x => x.ColorHex).HasMaxLength(7).IsFixedLength().IsRequired();
        b.Property(x => x.Size).HasMaxLength(10).IsRequired();
        b.Property(x => x.Sku).HasMaxLength(40).IsRequired();
        b.HasIndex(x => x.Sku).IsUnique();
        b.HasIndex(x => new { x.ProductId, x.ColorName, x.Size }).IsUnique();
        b.ToTable(t => t.HasCheckConstraint("CK_ProductVariants_Stock", "[Stock] >= 0"));
    }
}

public sealed class ProductSpecificationConfiguration : IEntityTypeConfiguration<ProductSpecification>
{
    public void Configure(EntityTypeBuilder<ProductSpecification> b)
    {
        b.Property(x => x.Group).HasMaxLength(60).IsRequired();
        b.HasIndex(x => new { x.ProductId, x.SortOrder });
        b.Property(x => x.Label).HasMaxLength(80).IsRequired();
        b.Property(x => x.Value).HasMaxLength(120).IsRequired();
        b.Property(x => x.Unit).HasMaxLength(20);
    }
}

public sealed class ProductFeatureConfiguration : IEntityTypeConfiguration<ProductFeature>
{
    public void Configure(EntityTypeBuilder<ProductFeature> b)
    {
        b.Property(x => x.Title).HasMaxLength(120).IsRequired();
        b.Property(x => x.Description).HasMaxLength(600);
    }
}

public sealed class ProductMediaConfiguration : IEntityTypeConfiguration<ProductMedia>
{
    public void Configure(EntityTypeBuilder<ProductMedia> b)
    {
        b.Property(x => x.Type).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Url).HasMaxLength(500).IsRequired();
        b.Property(x => x.AltText).HasMaxLength(200).IsRequired();
        b.Property(x => x.Caption).HasMaxLength(300);
        b.Property(x => x.ColorName).HasMaxLength(40);
        b.Property(x => x.Credit).HasMaxLength(120);
    }
}

public sealed class ServiceConfiguration : IEntityTypeConfiguration<Service>
{
    public void Configure(EntityTypeBuilder<Service> b)
    {
        b.ConfigurePublishable();
        b.Property(x => x.Title).HasMaxLength(140).IsRequired();
        b.Property(x => x.Summary).HasMaxLength(300).IsRequired();
        b.Property(x => x.Description).HasMaxLength(6000);
        b.Property(x => x.ImageUrl).HasMaxLength(500);
        b.Property(x => x.ImageAlt).HasMaxLength(200);
        b.HasMany(x => x.Benefits).WithOne().HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ServiceBenefitConfiguration : IEntityTypeConfiguration<ServiceBenefit>
{
    public void Configure(EntityTypeBuilder<ServiceBenefit> b) =>
        b.Property(x => x.Text).HasMaxLength(200).IsRequired();
}

public sealed class LookbookConfiguration : IEntityTypeConfiguration<Lookbook>
{
    public void Configure(EntityTypeBuilder<Lookbook> b)
    {
        b.ConfigurePublishable();
        b.Property(x => x.Title).HasMaxLength(160).IsRequired();
        b.Property(x => x.Season).HasMaxLength(60).IsRequired();
        b.Property(x => x.Location).HasMaxLength(100);
        b.Property(x => x.Summary).HasMaxLength(400).IsRequired();
        b.Property(x => x.Story).HasMaxLength(4000);
        b.Property(x => x.Credits).HasMaxLength(500);
        b.HasIndex(x => x.Year);

        b.HasMany(x => x.Media).WithOne().HasForeignKey(m => m.LookbookId).OnDelete(DeleteBehavior.Cascade);
        // "Shop the look": a product can appear in many lookbooks.
        b.HasMany(x => x.Products).WithMany(p => p.Lookbooks).UsingEntity(j => j.ToTable("LookbookProducts"));
    }
}

public sealed class LookbookMediaConfiguration : IEntityTypeConfiguration<LookbookMedia>
{
    public void Configure(EntityTypeBuilder<LookbookMedia> b)
    {
        b.Property(x => x.Url).HasMaxLength(500).IsRequired();
        b.Property(x => x.AltText).HasMaxLength(200).IsRequired();
        b.Property(x => x.Caption).HasMaxLength(300);
        b.Property(x => x.Credit).HasMaxLength(120);
    }
}

public sealed class ContactInquiryConfiguration : IEntityTypeConfiguration<ContactInquiry>
{
    public void Configure(EntityTypeBuilder<ContactInquiry> b)
    {
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.Property(x => x.Email).HasMaxLength(254).IsRequired();
        b.Property(x => x.Phone).HasMaxLength(40);
        b.Property(x => x.CompanyName).HasMaxLength(120);
        b.Property(x => x.Subject).HasMaxLength(150).IsRequired();
        b.Property(x => x.Message).HasMaxLength(4000).IsRequired();
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.InternalNotes).HasMaxLength(2000);
        b.Property(x => x.SourceIpHash).HasMaxLength(64);
        b.HasIndex(x => new { x.Status, x.CreatedAt });
    }
}

public sealed class OrderRequestConfiguration : IEntityTypeConfiguration<OrderRequest>
{
    public void Configure(EntityTypeBuilder<OrderRequest> b)
    {
        b.Property(x => x.Type).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.Property(x => x.Email).HasMaxLength(254).IsRequired();
        b.Property(x => x.Phone).HasMaxLength(40);
        b.Property(x => x.CompanyName).HasMaxLength(120);
        b.Property(x => x.Country).HasMaxLength(80);
        b.Property(x => x.ColorName).HasMaxLength(40);
        b.Property(x => x.Size).HasMaxLength(10);
        b.Property(x => x.Details).HasMaxLength(4000).IsRequired();
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.InternalNotes).HasMaxLength(2000);
        b.Property(x => x.SourceIpHash).HasMaxLength(64);

        // Keep the request history if a product is later removed.
        b.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.SetNull);
        b.HasIndex(x => new { x.Status, x.CreatedAt });
        b.HasIndex(x => x.Type);
    }
}
