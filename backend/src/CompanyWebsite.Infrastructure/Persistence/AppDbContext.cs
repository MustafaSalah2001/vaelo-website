using CompanyWebsite.Application.Abstractions;
using CompanyWebsite.Domain.Common;
using CompanyWebsite.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CompanyWebsite.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options, TimeProvider? clock = null)
    : DbContext(options), IApplicationDbContext
{
    private readonly TimeProvider _clock = clock ?? TimeProvider.System;

    public DbSet<CompanyProfile> CompanyProfiles => Set<CompanyProfile>();
    public DbSet<CompanyMetric> CompanyMetrics => Set<CompanyMetric>();
    public DbSet<CompanyMilestone> CompanyMilestones => Set<CompanyMilestone>();
    public DbSet<SiteSetting> SiteSettings => Set<SiteSetting>();
    public DbSet<Testimonial> Testimonials => Set<Testimonial>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<ProductCategory> ProductCategories => Set<ProductCategory>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductSpecification> ProductSpecifications => Set<ProductSpecification>();
    public DbSet<ProductFeature> ProductFeatures => Set<ProductFeature>();
    public DbSet<ProductMedia> ProductMedia => Set<ProductMedia>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<ServiceBenefit> ServiceBenefits => Set<ServiceBenefit>();
    public DbSet<Lookbook> Lookbooks => Set<Lookbook>();
    public DbSet<LookbookMedia> LookbookMedia => Set<LookbookMedia>();
    public DbSet<ContactInquiry> ContactInquiries => Set<ContactInquiry>();
    public DbSet<OrderRequest> OrderRequests => Set<OrderRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampAuditFields();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        StampAuditFields();
        return base.SaveChanges();
    }

    private void StampAuditFields()
    {
        var now = _clock.GetUtcNow().UtcDateTime;
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
                entry.Property(e => e.CreatedAt).IsModified = false;
            }
        }
    }
}
