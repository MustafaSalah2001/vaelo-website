using CompanyWebsite.Application.Dtos;
using CompanyWebsite.Application.Services;
using CompanyWebsite.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CompanyWebsite.API.Controllers;

/// <summary>Product management for the admin dashboard. Requires an Admin JWT.</summary>
[ApiController]
[Route("api/admin/products")]
[Authorize(Roles = Roles.Admin)]
[Produces("application/json")]
public sealed class AdminProductsController(IAdminProductService products) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<ProductSummaryDto>> List(CancellationToken ct) => products.ListAllAsync(ct);

    [HttpGet("{id:int}")]
    public Task<ProductDetailDto> Get(int id, CancellationToken ct) => products.GetAsync(id, ct);

    [HttpPost]
    [ProducesResponseType<ProductDetailDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductDetailDto>> Create([FromBody] ProductUpsertRequest request, CancellationToken ct)
    {
        var created = await products.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public Task<ProductDetailDto> Update(int id, [FromBody] ProductUpsertRequest request, CancellationToken ct) =>
        products.UpdateAsync(id, request, ct);

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await products.DeleteAsync(id, ct);
        return NoContent();
    }
}

/// <summary>Inbox of contact messages and reservation / made-to-measure / wholesale requests.</summary>
[ApiController]
[Route("api/admin/inquiries")]
[Authorize(Roles = Roles.Admin)]
[Produces("application/json")]
public sealed class AdminInquiriesController(IInquiryService inquiries) : ControllerBase
{
    /// <param name="kind">"contact", "order" or empty for both.</param>
    /// <param name="status">New, InProgress, Answered, Closed or Spam.</param>
    [HttpGet]
    public Task<PagedResult<InquiryListItemDto>> List(
        [FromQuery] string? kind, [FromQuery] string? status,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25, CancellationToken ct = default) =>
        inquiries.ListAsync(string.IsNullOrWhiteSpace(kind) ? null : kind.ToLowerInvariant(), status, page, pageSize, ct);

    [HttpPatch("{kind}/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateStatus(string kind, int id, [FromBody] UpdateInquiryStatusRequest request, CancellationToken ct)
    {
        await inquiries.UpdateStatusAsync(kind.ToLowerInvariant(), id, request, ct);
        return NoContent();
    }
}
