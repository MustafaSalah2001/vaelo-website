using CompanyWebsite.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CompanyWebsite.Application.Abstractions;

/// <summary>
/// The persistence surface the application layer depends on. Implemented by the EF Core
/// AppDbContext in Infrastructure; tests substitute an in-memory context.
/// </summary>
public interface IApplicationDbContext
{
    DbSet<CompanyProfile> CompanyProfiles { get; }
    DbSet<CompanyMetric> CompanyMetrics { get; }
    DbSet<CompanyMilestone> CompanyMilestones { get; }
    DbSet<SiteSetting> SiteSettings { get; }
    DbSet<Testimonial> Testimonials { get; }
    DbSet<AdminUser> AdminUsers { get; }
    DbSet<ProductCategory> ProductCategories { get; }
    DbSet<Product> Products { get; }
    DbSet<ProductSpecification> ProductSpecifications { get; }
    DbSet<ProductFeature> ProductFeatures { get; }
    DbSet<ProductMedia> ProductMedia { get; }
    DbSet<ProductVariant> ProductVariants { get; }
    DbSet<Service> Services { get; }
    DbSet<ServiceBenefit> ServiceBenefits { get; }
    DbSet<Lookbook> Lookbooks { get; }
    DbSet<LookbookMedia> LookbookMedia { get; }
    DbSet<ContactInquiry> ContactInquiries { get; }
    DbSet<OrderRequest> OrderRequests { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) CreateToken(AdminUser user);
}

public interface IPasswordHasher
{
    string Hash(AdminUser user, string password);
    bool Verify(AdminUser user, string password);
}
