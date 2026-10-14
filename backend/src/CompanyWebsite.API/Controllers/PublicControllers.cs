using CompanyWebsite.Application.Common;
using CompanyWebsite.Application.Dtos;
using CompanyWebsite.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace CompanyWebsite.API.Controllers;

/// <summary>Brand identity, figures, timeline, testimonials and public site settings.</summary>
[ApiController]
[Route("api/company")]
[Produces("application/json")]
public sealed class CompanyController(ICompanyService company) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<CompanyDto>(StatusCodes.Status200OK)]
    public Task<CompanyDto> Get(CancellationToken ct) => company.GetAsync(ct);

    /// <summary>Published testimonials only. Returns an empty list until real ones are added.</summary>
    [HttpGet("testimonials")]
    public Task<IReadOnlyList<TestimonialDto>> Testimonials(CancellationToken ct) => company.GetTestimonialsAsync(ct);

    /// <summary>Public settings (keys prefixed "seo." or "site.").</summary>
    [HttpGet("/api/settings")]
    public Task<IReadOnlyDictionary<string, string>> Settings(CancellationToken ct) => company.GetPublicSettingsAsync(ct);
}

[ApiController]
[Route("api")]
[Produces("application/json")]
public sealed class ProductsController(IProductService products) : ControllerBase
{
    [HttpGet("product-categories")]
    public Task<IReadOnlyList<ProductCategoryDto>> Categories(CancellationToken ct) => products.GetCategoriesAsync(ct);

    /// <summary>Search the catalog. All filters are optional and combine with AND.</summary>
    [HttpGet("products")]
    public Task<PagedResult<ProductSummaryDto>> Search(
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] bool? featured,
        [FromQuery] string? color,
        [FromQuery] string? sort,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken ct = default) =>
        products.SearchAsync(new ProductQuery(category, search, featured, color, sort, page, pageSize), ct);

    [HttpGet("products/{slug}")]
    [ProducesResponseType<ProductDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductDetailDto>> GetBySlug(string slug, CancellationToken ct)
    {
        if (!Slug.IsValid(slug)) return NotFound();
        return await products.GetBySlugAsync(slug, ct);
    }
}

[ApiController]
[Route("api/services")]
[Produces("application/json")]
public sealed class ServicesController(IServiceCatalog services) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<ServiceSummaryDto>> GetAll(CancellationToken ct) => services.GetAllAsync(ct);

    [HttpGet("{slug}")]
    [ProducesResponseType<ServiceDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ServiceDetailDto>> GetBySlug(string slug, CancellationToken ct)
    {
        if (!Slug.IsValid(slug)) return NotFound();
        return await services.GetBySlugAsync(slug, ct);
    }
}

/// <summary>Seasonal campaigns with "shop the look" products.</summary>
[ApiController]
[Route("api/lookbooks")]
[Produces("application/json")]
public sealed class LookbooksController(ILookbookService lookbooks) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<LookbookSummaryDto>> GetAll([FromQuery] bool? featured, CancellationToken ct) =>
        lookbooks.GetAllAsync(featured, ct);

    [HttpGet("{slug}")]
    [ProducesResponseType<LookbookDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LookbookDetailDto>> GetBySlug(string slug, CancellationToken ct)
    {
        if (!Slug.IsValid(slug)) return NotFound();
        return await lookbooks.GetBySlugAsync(slug, ct);
    }
}
