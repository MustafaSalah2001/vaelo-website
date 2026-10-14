using CompanyWebsite.Application.Common;
using CompanyWebsite.Application.Dtos;
using CompanyWebsite.Application.Services;
using CompanyWebsite.Domain.Enums;
using CompanyWebsite.Infrastructure.Auth;
using CompanyWebsite.Infrastructure.Persistence;
using CompanyWebsite.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace CompanyWebsite.Tests;

public class SlugAndSizeTests
{
    [Theory]
    [InlineData("Halden Wool Overcoat", "halden-wool-overcoat")]
    [InlineData("  Pull-over   Écru ", "pull-over-ecru")]
    [InlineData("---", "")]
    public void Slug_from_builds_url_safe_slugs(string input, string expected) =>
        Assert.Equal(expected, Slug.From(input));

    [Fact]
    public void Sizes_sort_letters_then_numbers()
    {
        var sorted = SizeOrder.Sort(["L", "32", "XS", "M", "28", "XXL", "s"]);
        Assert.Equal(new[] { "XS", "s", "M", "L", "XXL", "28", "32" }, sorted);
    }
}

public class SeederTests
{
    [Fact]
    public async Task Seeding_twice_does_not_duplicate_content()
    {
        await using var db = await TestDb.CreateSeededAsync();
        var before = await db.Products.CountAsync();

        var seeder = new DbSeeder(db, new IdentityPasswordHasher(), Options.Create(new SeedOptions()), NullLogger<DbSeeder>.Instance);
        await seeder.SeedAsync();

        Assert.Equal(10, before);
        Assert.Equal(before, await db.Products.CountAsync());
    }

    [Fact]
    public async Task Every_product_gets_one_variant_per_colour_and_size_with_unique_skus()
    {
        await using var db = await TestDb.CreateSeededAsync();
        var coat = await db.Products.Include(p => p.Variants).SingleAsync(p => p.Slug == "halden-wool-overcoat");

        Assert.Equal(2 * 5, coat.Variants.Count); // Camel, Charcoal × XS–XL
        var allSkus = await db.ProductVariants.Select(v => v.Sku).ToListAsync();
        Assert.Equal(allSkus.Count, allSkus.Distinct().Count());
        Assert.Contains(await db.ProductVariants.ToListAsync(), v => v.Stock == 0); // some sizes sold out
    }

    [Fact]
    public async Task Seeded_content_is_demo_and_testimonials_stay_empty()
    {
        await using var db = await TestDb.CreateSeededAsync();
        Assert.All(await db.Products.ToListAsync(), p => Assert.True(p.IsDemo));
        Assert.All(await db.Lookbooks.ToListAsync(), l => Assert.True(l.IsDemo));
        Assert.Empty(await db.Testimonials.ToListAsync());
    }
}

public class ProductServiceTests
{
    [Fact]
    public async Task Search_matches_name_and_category()
    {
        await using var db = await TestDb.CreateSeededAsync();
        var result = await new ProductService(db).SearchAsync(new ProductQuery(Search: "DENIM"), default);

        Assert.Contains(result.Items, p => p.Slug == "field-denim-jacket");
        Assert.Contains(result.Items, p => p.Slug == "straight-selvedge-jeans");
    }

    [Fact]
    public async Task Colour_filter_and_price_sort_work_together()
    {
        await using var db = await TestDb.CreateSeededAsync();
        var result = await new ProductService(db).SearchAsync(new ProductQuery(Color: "black", Sort: "price-asc"), default);

        Assert.NotEmpty(result.Items);
        Assert.All(result.Items, p => Assert.Contains(p.Colors, c => c.Name == "Black"));
        Assert.Equal(result.Items.Select(p => p.Price).OrderBy(x => x), result.Items.Select(p => p.Price));
    }

    [Fact]
    public async Task Summary_has_cover_and_hover_images()
    {
        await using var db = await TestDb.CreateSeededAsync();
        var result = await new ProductService(db).SearchAsync(new ProductQuery(Category: "outerwear"), default);
        var coat = Assert.Single(result.Items);

        Assert.NotNull(coat.ImageUrl);
        Assert.NotNull(coat.HoverImageUrl);
        Assert.NotEqual(coat.ImageUrl, coat.HoverImageUrl);
    }

    [Fact]
    public async Task Detail_orders_sizes_and_tags_photos_by_colour()
    {
        await using var db = await TestDb.CreateSeededAsync();
        var jeans = await new ProductService(db).GetBySlugAsync("straight-selvedge-jeans", default);

        Assert.Equal(new[] { "28", "30", "32", "34", "36" }, jeans.Sizes);
        Assert.Contains(jeans.Media, m => m.ColorName == "Black");
        Assert.Contains(jeans.Lookbooks, l => l.Slug == "indigo-hours");
    }

    [Fact]
    public async Task Unpublished_products_are_hidden()
    {
        await using var db = await TestDb.CreateSeededAsync();
        var tee = await db.Products.SingleAsync(p => p.Slug == "everyday-heavy-tee");
        tee.IsPublished = false;
        await db.SaveChangesAsync();

        var service = new ProductService(db);
        Assert.DoesNotContain((await service.SearchAsync(new ProductQuery(), default)).Items, p => p.Slug == tee.Slug);
        await Assert.ThrowsAsync<NotFoundException>(() => service.GetBySlugAsync(tee.Slug, default));
    }
}

public class LookbookServiceTests
{
    [Fact]
    public async Task Lookbook_detail_lists_its_products()
    {
        await using var db = await TestDb.CreateSeededAsync();
        var lookbook = await new LookbookService(db).GetBySlugAsync("north-light-aw26", default);

        Assert.Equal(6, lookbook.Media.Count);
        Assert.Contains(lookbook.Products, p => p.Slug == "halden-wool-overcoat");
    }
}

public class InquiryServiceTests
{
    private static InquiryService Create(AppDbContext db) => new(db, NullLogger<InquiryService>.Instance);

    private static OrderRequestRequest Reservation(string color, string size) => new()
    {
        Type = "reservation", Name = "Ada Lovelace", Email = "ada@example.com",
        ProductSlug = "halden-wool-overcoat", Color = color, Size = size,
        Details = "I'd like to try it on Saturday."
    };

    [Fact]
    public async Task Honeypot_contact_looks_successful_but_is_not_stored()
    {
        await using var db = TestDb.Create();
        var result = await Create(db).SubmitContactAsync(new ContactInquiryRequest
        {
            Name = "Bot", Email = "bot@example.com", Subject = "Hello", Message = "Buy cheap followers now please.", Website = "x"
        }, null, default);

        Assert.Equal("received", result.Reference);
        Assert.Empty(await db.ContactInquiries.ToListAsync());
    }

    [Fact]
    public async Task Reservation_in_stock_is_stored_with_reference()
    {
        await using var db = await TestDb.CreateSeededAsync();
        var inStock = await db.ProductVariants.FirstAsync(v => v.Stock > 0 && v.Sku.StartsWith("VA-OC01"));

        var result = await Create(db).SubmitOrderRequestAsync(Reservation(inStock.ColorName, inStock.Size), "hash", default);

        Assert.StartsWith("REQ-", result.Reference);
        var stored = await db.OrderRequests.SingleAsync();
        Assert.Equal(OrderRequestType.Reservation, stored.Type);
        Assert.Equal(inStock.Size, stored.Size);
    }

    [Fact]
    public async Task Reservation_for_sold_out_size_is_rejected()
    {
        await using var db = await TestDb.CreateSeededAsync();
        var soldOut = await db.ProductVariants.FirstAsync(v => v.Stock == 0);
        var product = await db.Products.SingleAsync(p => p.Id == soldOut.ProductId);

        var request = new OrderRequestRequest
        {
            Type = "Reservation", Name = "Ada", Email = "ada@example.com", ProductSlug = product.Slug,
            Color = soldOut.ColorName, Size = soldOut.Size, Details = "Hold it please."
        };

        var ex = await Assert.ThrowsAsync<ValidationException>(() => Create(db).SubmitOrderRequestAsync(request, null, default));
        Assert.Contains("sold out", ex.Errors[nameof(OrderRequestRequest.Size)][0]);
    }

    [Fact]
    public async Task Wholesale_requires_company_and_unknown_type_is_rejected()
    {
        await using var db = await TestDb.CreateSeededAsync();
        var service = Create(db);

        await Assert.ThrowsAsync<ValidationException>(() => service.SubmitOrderRequestAsync(new OrderRequestRequest
        {
            Type = "Wholesale", Name = "Ada", Email = "ada@example.com", Details = "Twenty coats for our shop."
        }, null, default));

        await Assert.ThrowsAsync<ValidationException>(() => service.SubmitOrderRequestAsync(new OrderRequestRequest
        {
            Type = "Barter", Name = "Ada", Email = "ada@example.com", Details = "Something else entirely."
        }, null, default));
    }
}

public class AuthAndAdminTests
{
    private const string Email = "admin@vaelo.example";
    private const string Password = "correct-horse-battery";

    private static AuthService CreateAuth(AppDbContext db) => new(
        db, new IdentityPasswordHasher(),
        new JwtTokenService(Options.Create(new JwtOptions { SigningKey = new string('k', 48) }), TimeProvider.System),
        TimeProvider.System, NullLogger<AuthService>.Instance);

    [Fact]
    public async Task Login_works_and_wrong_password_fails()
    {
        await using var db = await TestDb.CreateSeededAsync(Email, Password);
        var auth = CreateAuth(db);

        var ok = await auth.LoginAsync(new LoginRequest { Email = "ADMIN@vaelo.example", Password = Password }, default);
        Assert.False(string.IsNullOrWhiteSpace(ok.Token));

        await Assert.ThrowsAsync<AuthenticationFailedException>(() =>
            auth.LoginAsync(new LoginRequest { Email = Email, Password = "wrong-password-123" }, default));
    }

    [Fact]
    public async Task Admin_product_rejects_duplicate_sku()
    {
        await using var db = await TestDb.CreateSeededAsync();
        var categoryId = (await db.ProductCategories.FirstAsync()).Id;
        var existingSku = (await db.ProductVariants.FirstAsync()).Sku;

        await Assert.ThrowsAsync<ConflictException>(() => new AdminProductService(db).CreateAsync(new ProductUpsertRequest
        {
            Name = "Copy Coat", Summary = "A coat that reuses an existing SKU.", Description = "Should fail.",
            Price = 100, Currency = "USD", CategoryId = categoryId,
            Variants = [new VariantInput { ColorName = "Black", ColorHex = "#000000", Size = "M", Sku = existingSku, Stock = 1 }]
        }, default));
    }

    [Fact]
    public async Task Admin_created_product_is_real_content_with_variants()
    {
        await using var db = await TestDb.CreateSeededAsync();
        var categoryId = (await db.ProductCategories.FirstAsync()).Id;

        var created = await new AdminProductService(db).CreateAsync(new ProductUpsertRequest
        {
            Name = "Moss Field Parka", Summary = "Waxed cotton parka for wet days.", Description = "Real product.",
            Price = 320, Currency = "USD", CategoryId = categoryId,
            Variants =
            [
                new VariantInput { ColorName = "Moss", ColorHex = "#4b5a3a", Size = "M", Sku = "va-pk01-mos-m", Stock = 3 },
                new VariantInput { ColorName = "Moss", ColorHex = "#4b5a3a", Size = "L", Sku = "va-pk01-mos-l", Stock = 0 }
            ]
        }, default);

        Assert.Equal("moss-field-parka", created.Slug);
        Assert.False(created.IsDemo);
        Assert.Equal(new[] { "M", "L" }, created.Sizes);
        Assert.Equal("#4B5A3A", created.Colors.Single().Hex);
        Assert.Contains(created.Variants, v => v.Sku == "VA-PK01-MOS-L" && !v.InStock);
    }
}
