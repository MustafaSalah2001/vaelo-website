using System.Text.Json;
using CompanyWebsite.Application.Abstractions;
using CompanyWebsite.Domain.Entities;
using CompanyWebsite.Domain.Enums;
using CompanyWebsite.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CompanyWebsite.Infrastructure.Seed;

public sealed class SeedOptions
{
    public const string Section = "Seed";

    /// <summary>Load the bundled demo company when the database is empty.</summary>
    public bool DemoContent { get; set; } = true;

    /// <summary>First admin account. Supply through user-secrets or environment variables, never appsettings.</summary>
    public string? AdminEmail { get; set; }
    public string? AdminPassword { get; set; }
    public string AdminDisplayName { get; set; } = "Site administrator";
}

/// <summary>
/// Idempotent seeding: each block only runs when its table is empty, so restarting the API
/// never duplicates or overwrites content an admin has edited.
/// </summary>
public sealed class DbSeeder(
    AppDbContext db,
    IPasswordHasher hasher,
    IOptions<SeedOptions> options,
    ILogger<DbSeeder> logger)
{
    private const string ResourceName = "CompanyWebsite.Infrastructure.Seed.demo-content.json";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip
    };

    public async Task SeedAsync(CancellationToken ct = default)
    {
        var opts = options.Value;

        if (opts.DemoContent && !await db.CompanyProfiles.AnyAsync(ct))
        {
            var content = LoadDemoContent();
            SeedContent(content);
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Seeded demo content: {Products} products, {Services} services, {Lookbooks} lookbooks",
                content.Products.Count, content.Services.Count, content.Lookbooks.Count);
        }

        await SeedAdminAsync(opts, ct);
    }

    private async Task SeedAdminAsync(SeedOptions opts, CancellationToken ct)
    {
        if (await db.AdminUsers.AnyAsync(ct)) return;

        if (string.IsNullOrWhiteSpace(opts.AdminEmail) || string.IsNullOrWhiteSpace(opts.AdminPassword))
        {
            logger.LogWarning("No admin user exists and Seed:AdminEmail / Seed:AdminPassword are not set. The admin API will be unusable until one is created.");
            return;
        }

        if (opts.AdminPassword.Length < 12)
        {
            logger.LogError("Seed:AdminPassword must be at least 12 characters. Admin user not created.");
            return;
        }

        var admin = new AdminUser
        {
            Email = opts.AdminEmail.Trim().ToLowerInvariant(),
            DisplayName = opts.AdminDisplayName,
            Role = Roles.Admin
        };
        admin.PasswordHash = hasher.Hash(admin, opts.AdminPassword);
        db.AdminUsers.Add(admin);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Created initial admin user {Email}", admin.Email);
    }

    internal static DemoContent LoadDemoContent()
    {
        using var stream = typeof(DbSeeder).Assembly.GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException($"Embedded resource '{ResourceName}' not found.");
        return JsonSerializer.Deserialize<DemoContent>(stream, JsonOptions)
            ?? throw new InvalidOperationException("Demo content is empty.");
    }

    private void SeedContent(DemoContent c)
    {
        var co = c.Company;
        var profile = new CompanyProfile
        {
            Name = co.Name, Tagline = co.Tagline, Headline = co.Headline, Introduction = co.Introduction,
            Story = co.Story, Mission = co.Mission, Vision = co.Vision,
            Values = string.Join('\n', co.Values),
            FoundedYear = co.FoundedYear, Email = co.Email, Phone = co.Phone,
            AddressLine = co.AddressLine, City = co.City, Country = co.Country,
            IsDemo = true,
            Metrics = co.Metrics.Select((m, i) => new CompanyMetric { Label = m.Label, Value = m.Value, Suffix = m.Suffix, SortOrder = i }).ToList(),
            Milestones = co.Milestones.Select(m => new CompanyMilestone { Year = m.Year, Title = m.Title, Description = m.Description }).ToList()
        };
        db.CompanyProfiles.Add(profile);

        foreach (var (key, value) in c.Settings)
            db.SiteSettings.Add(new SiteSetting { Key = key, Value = value });

        var categories = c.Categories
            .Select((cat, i) => new ProductCategory { Name = cat.Name, Slug = cat.Slug, Description = cat.Description, SortOrder = i })
            .ToDictionary(x => x.Slug);
        db.ProductCategories.AddRange(categories.Values);

        var products = new Dictionary<string, Product>();
        foreach (var (p, i) in c.Products.Select((p, i) => (p, i)))
        {
            var product = new Product
            {
                Slug = p.Slug, Name = p.Name, StyleCode = p.StyleCode, Summary = p.Summary, Description = p.Description,
                Price = p.Price, Currency = p.Currency, IsFeatured = p.IsFeatured, IsNew = p.IsNew,
                SortOrder = i, IsDemo = true,
                Category = categories[p.CategorySlug],
                Specifications = p.Specifications.Select((s, j) => new ProductSpecification { Group = s.Group, Label = s.Label, Value = s.Value, Unit = s.Unit, SortOrder = j }).ToList(),
                Features = p.Features.Select((f, j) => new ProductFeature { Title = f.Title, Description = f.Description, SortOrder = j }).ToList(),
                Media = p.Images.Select((m, j) => new ProductMedia
                {
                    Type = MediaType.Image, Url = m.Url, AltText = m.Alt, ColorName = m.Color, Credit = "Unsplash", SortOrder = j
                }).ToList(),
                Variants = BuildVariants(p, i)
            };
            products[p.Slug] = product;
            db.Products.Add(product);
        }

        foreach (var (s, i) in c.Services.Select((s, i) => (s, i)))
        {
            db.Services.Add(new Service
            {
                Slug = s.Slug, Title = s.Title, Summary = s.Summary, Description = s.Description,
                ImageUrl = s.ImageUrl, ImageAlt = s.ImageAlt, SortOrder = i, IsDemo = true,
                Benefits = s.Benefits.Select((b, j) => new ServiceBenefit { Text = b, SortOrder = j }).ToList()
            });
        }

        foreach (var (l, i) in c.Lookbooks.Select((l, i) => (l, i)))
        {
            db.Lookbooks.Add(new Lookbook
            {
                Slug = l.Slug, Title = l.Title, Season = l.Season, Year = l.Year, Location = l.Location,
                Summary = l.Summary, Story = l.Story, Credits = l.Credits, IsFeatured = l.IsFeatured,
                SortOrder = i, IsDemo = true,
                Media = l.Images.Select((m, j) => new LookbookMedia { Url = m.Url, AltText = m.Alt, Credit = "Unsplash", SortOrder = j }).ToList(),
                Products = l.Products.Where(products.ContainsKey).Select(slug => products[slug]).ToList()
            });
        }
    }

    /// <summary>
    /// One variant per colour × size. Demo stock is deterministic (not random) so tests and
    /// screenshots are stable; roughly one size in seven is sold out to show that state.
    /// </summary>
    internal static List<ProductVariant> BuildVariants(DemoProduct p, int productIndex)
    {
        var variants = new List<ProductVariant>();
        var order = 0;
        foreach (var (color, ci) in p.Colors.Select((c, ci) => (c, ci)))
        {
            var colorCode = new string(color.Name.Where(char.IsLetter).Take(3).ToArray()).ToUpperInvariant();
            foreach (var (size, si) in p.Sizes.Select((s, si) => (s, si)))
            {
                var stock = (productIndex * 5 + ci * 3 + si * 2) % 7 == 0 ? 0 : 2 + (productIndex + ci + si) % 9;
                variants.Add(new ProductVariant
                {
                    ColorName = color.Name,
                    ColorHex = color.Hex.ToUpperInvariant(),
                    Size = size,
                    Sku = $"{p.StyleCode}-{colorCode}-{size}".ToUpperInvariant(),
                    Stock = stock,
                    SortOrder = order++
                });
            }
        }
        return variants;
    }

    // ── JSON shape of demo-content.json ─────────────────────────────────────
    internal sealed record DemoContent(
        DemoCompany Company,
        Dictionary<string, string> Settings,
        List<DemoCategory> Categories,
        List<DemoProduct> Products,
        List<DemoService> Services,
        List<DemoLookbook> Lookbooks);

    internal sealed record DemoCompany(
        string Name, string Tagline, string Headline, string Introduction, string Story, string Mission, string Vision,
        List<string> Values, int? FoundedYear, string? Email, string? Phone, string? AddressLine, string? City, string? Country,
        List<DemoMetric> Metrics, List<DemoMilestone> Milestones);

    internal sealed record DemoMetric(string Label, string Value, string? Suffix);
    internal sealed record DemoMilestone(int Year, string Title, string Description);
    internal sealed record DemoCategory(string Name, string Slug, string? Description);
    internal sealed record DemoSpec(string Group, string Label, string Value, string? Unit);
    internal sealed record DemoFeature(string Title, string Description);
    internal sealed record DemoColor(string Name, string Hex);
    internal sealed record DemoImage(string Url, string Alt, string? Color);

    internal sealed record DemoProduct(
        string Slug, string Name, string StyleCode, string CategorySlug, decimal Price, string Currency,
        bool IsFeatured, bool IsNew, string Summary, string Description,
        List<DemoColor> Colors, List<string> Sizes, List<DemoImage> Images,
        List<DemoSpec> Specifications, List<DemoFeature> Features);

    internal sealed record DemoService(
        string Slug, string Title, string? ImageUrl, string? ImageAlt, string Summary, string Description, List<string> Benefits);

    internal sealed record DemoLookbook(
        string Slug, string Title, string Season, int Year, string? Location, bool IsFeatured,
        string Summary, string Story, string? Credits, List<DemoImage> Images, List<string> Products);
}
