using CompanyWebsite.Application.Abstractions;
using CompanyWebsite.Application.Common;
using CompanyWebsite.Application.Dtos;
using CompanyWebsite.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CompanyWebsite.Application.Services;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct);
}

public sealed class AuthService(
    IApplicationDbContext db,
    IPasswordHasher hasher,
    ITokenService tokens,
    TimeProvider clock,
    ILogger<AuthService> logger) : IAuthService
{
    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.AdminUsers.FirstOrDefaultAsync(u => u.Email == email && u.IsActive, ct);

        // Same failure for "no such user" and "wrong password" to avoid account enumeration.
        if (user is null || !hasher.Verify(user, request.Password))
        {
            logger.LogWarning("Failed admin login for {Email}", email);
            throw new AuthenticationFailedException();
        }

        user.LastLoginAt = clock.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(ct);

        var (token, expiresAt) = tokens.CreateToken(user);
        return new LoginResponse(token, expiresAt, user.DisplayName, user.Role);
    }
}

/// <summary>Write side for products, used by the admin API.</summary>
public interface IAdminProductService
{
    Task<IReadOnlyList<ProductSummaryDto>> ListAllAsync(CancellationToken ct);
    Task<ProductDetailDto> GetAsync(int id, CancellationToken ct);
    Task<ProductDetailDto> CreateAsync(ProductUpsertRequest request, CancellationToken ct);
    Task<ProductDetailDto> UpdateAsync(int id, ProductUpsertRequest request, CancellationToken ct);
    Task DeleteAsync(int id, CancellationToken ct);
}

public sealed class AdminProductService(IApplicationDbContext db) : IAdminProductService
{
    public async Task<IReadOnlyList<ProductSummaryDto>> ListAllAsync(CancellationToken ct)
    {
        var products = await db.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Media)
            .Include(p => p.Variants)
            .OrderBy(p => p.SortOrder).ThenBy(p => p.Name)
            .ToListAsync(ct);
        return products.Select(ProductService.ToSummary).ToList();
    }

    public async Task<ProductDetailDto> GetAsync(int id, CancellationToken ct) =>
        ProductService.Map(await LoadAsync(id, ct));

    public async Task<ProductDetailDto> CreateAsync(ProductUpsertRequest request, CancellationToken ct)
    {
        var product = new Product();
        await ApplyAsync(product, request, ct);
        db.Products.Add(product);
        await db.SaveChangesAsync(ct);
        return await GetAsync(product.Id, ct);
    }

    public async Task<ProductDetailDto> UpdateAsync(int id, ProductUpsertRequest request, CancellationToken ct)
    {
        var product = await LoadAsync(id, ct);
        await ApplyAsync(product, request, ct);
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct)
    {
        var product = await db.Products.FindAsync([id], ct) ?? throw new NotFoundException("Product", id);
        db.Products.Remove(product);
        await db.SaveChangesAsync(ct);
    }

    private async Task<Product> LoadAsync(int id, CancellationToken ct) =>
        await db.Products
            .Include(p => p.Category)
            .Include(p => p.Specifications)
            .Include(p => p.Features)
            .Include(p => p.Media)
            .Include(p => p.Variants)
            .Include(p => p.Lookbooks)
            .FirstOrDefaultAsync(p => p.Id == id, ct)
        ?? throw new NotFoundException("Product", id);

    private async Task ApplyAsync(Product product, ProductUpsertRequest r, CancellationToken ct)
    {
        var slug = string.IsNullOrWhiteSpace(r.Slug) ? Slug.From(r.Name) : r.Slug.Trim().ToLowerInvariant();
        if (!Slug.IsValid(slug))
            throw ValidationException.For(nameof(r.Slug), "Use lowercase letters, numbers and single hyphens only.");

        if (await db.Products.AnyAsync(p => p.Slug == slug && p.Id != product.Id, ct))
            throw new ConflictException($"Another product already uses the slug '{slug}'.");

        var category = await db.ProductCategories.FirstOrDefaultAsync(c => c.Id == r.CategoryId, ct)
            ?? throw ValidationException.For(nameof(r.CategoryId), "The selected category does not exist.");

        product.Name = r.Name.Trim();
        product.Slug = slug;
        product.StyleCode = r.StyleCode?.Trim();
        product.Price = r.Price;
        product.Currency = r.Currency;
        product.IsNew = r.IsNew;
        product.Summary = r.Summary.Trim();
        product.Description = r.Description.Trim();
        product.CategoryId = category.Id;
        product.Category = category;
        product.IsFeatured = r.IsFeatured;
        product.IsPublished = r.IsPublished;
        product.SortOrder = r.SortOrder;
        product.MetaTitle = r.MetaTitle?.Trim();
        product.MetaDescription = r.MetaDescription?.Trim();
        product.IsDemo = false; // anything saved by an admin is real content

        // Children are replaced as a set: the editor always sends the full, ordered list.
        product.Specifications.Clear();
        foreach (var (s, i) in r.Specifications.Select((s, i) => (s, i)))
            product.Specifications.Add(new ProductSpecification { Group = s.Group, Label = s.Label, Value = s.Value, Unit = s.Unit, SortOrder = i });

        product.Features.Clear();
        foreach (var (f, i) in r.Features.Select((f, i) => (f, i)))
            product.Features.Add(new ProductFeature { Title = f.Title, Description = f.Description, SortOrder = i });

        var duplicateSku = r.Variants.GroupBy(v => v.Sku, StringComparer.OrdinalIgnoreCase).FirstOrDefault(g => g.Count() > 1);
        if (duplicateSku is not null)
            throw ValidationException.For(nameof(r.Variants), $"SKU '{duplicateSku.Key}' is used more than once.");

        var skus = r.Variants.Select(v => v.Sku).ToList();
        if (await db.ProductVariants.AnyAsync(v => skus.Contains(v.Sku) && v.ProductId != product.Id, ct))
            throw new ConflictException("One of the SKUs is already used by another product.");

        product.Variants.Clear();
        foreach (var (v, i) in r.Variants.Select((v, i) => (v, i)))
            product.Variants.Add(new ProductVariant
            {
                ColorName = v.ColorName.Trim(), ColorHex = v.ColorHex.ToUpperInvariant(), Size = v.Size.Trim(),
                Sku = v.Sku.Trim().ToUpperInvariant(), Stock = v.Stock, SortOrder = i
            });
    }
}
