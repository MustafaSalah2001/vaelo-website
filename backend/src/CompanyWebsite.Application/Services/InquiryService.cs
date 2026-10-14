using CompanyWebsite.Application.Abstractions;
using CompanyWebsite.Application.Common;
using CompanyWebsite.Application.Dtos;
using CompanyWebsite.Domain.Entities;
using CompanyWebsite.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CompanyWebsite.Application.Services;

public interface IInquiryService
{
    Task<SubmissionResultDto> SubmitContactAsync(ContactInquiryRequest request, string? sourceIpHash, CancellationToken ct);
    Task<SubmissionResultDto> SubmitOrderRequestAsync(OrderRequestRequest request, string? sourceIpHash, CancellationToken ct);

    // Admin
    Task<PagedResult<InquiryListItemDto>> ListAsync(string? kind, string? status, int page, int pageSize, CancellationToken ct);
    Task UpdateStatusAsync(string kind, int id, UpdateInquiryStatusRequest request, CancellationToken ct);
}

public sealed class InquiryService(IApplicationDbContext db, ILogger<InquiryService> logger) : IInquiryService
{
    public const string ContactKind = "contact";
    public const string OrderKind = "order";

    private const string ContactConfirmation =
        "Thank you. Your message is with the atelier and we reply within two working days.";

    private static string OrderConfirmation(OrderRequestType type) => type switch
    {
        OrderRequestType.Reservation => "Thank you. We'll hold the piece for seven days and email you to arrange collection or a fitting.",
        OrderRequestType.MadeToMeasure => "Thank you. A tailor will email you within two working days to book your measuring appointment.",
        _ => "Thank you. Our wholesale team will send you the line sheet and terms within two working days."
    };

    public async Task<SubmissionResultDto> SubmitContactAsync(ContactInquiryRequest request, string? sourceIpHash, CancellationToken ct)
    {
        // Honeypot filled → respond exactly like a success so bots learn nothing, but store nothing.
        if (!string.IsNullOrWhiteSpace(request.Website))
        {
            logger.LogInformation("Contact submission dropped by honeypot (ip hash {IpHash})", sourceIpHash);
            return new SubmissionResultDto("received", ContactConfirmation);
        }

        var inquiry = new ContactInquiry
        {
            Name = request.Name.Trim(),
            Email = request.Email.Trim(),
            Phone = NullIfBlank(request.Phone),
            CompanyName = NullIfBlank(request.CompanyName),
            Subject = request.Subject.Trim(),
            Message = request.Message.Trim(),
            SourceIpHash = sourceIpHash
        };

        db.ContactInquiries.Add(inquiry);
        await db.SaveChangesAsync(ct);

        var reference = ContactReference(inquiry.Id);
        logger.LogInformation("Contact inquiry {Reference} stored", reference);
        return new SubmissionResultDto(reference, ContactConfirmation);
    }

    public async Task<SubmissionResultDto> SubmitOrderRequestAsync(OrderRequestRequest request, string? sourceIpHash, CancellationToken ct)
    {
        if (!Enum.TryParse<OrderRequestType>(request.Type, ignoreCase: true, out var type) || !Enum.IsDefined(type))
            throw ValidationException.For(nameof(request.Type), "Choose reservation, made-to-measure or wholesale.");

        if (!string.IsNullOrWhiteSpace(request.Website))
        {
            logger.LogInformation("Order request dropped by honeypot (ip hash {IpHash})", sourceIpHash);
            return new SubmissionResultDto("received", OrderConfirmation(type));
        }

        if (type == OrderRequestType.Wholesale && string.IsNullOrWhiteSpace(request.CompanyName))
            throw ValidationException.For(nameof(request.CompanyName), "Enter the name of your shop or company.");

        Product? product = null;
        if (!string.IsNullOrWhiteSpace(request.ProductSlug))
        {
            product = await db.Products
                .Include(p => p.Variants)
                .FirstOrDefaultAsync(p => p.Slug == request.ProductSlug && p.IsPublished, ct)
                ?? throw ValidationException.For(nameof(request.ProductSlug), "The selected piece does not exist.");
        }

        if (type == OrderRequestType.Reservation)
        {
            if (product is null)
                throw ValidationException.For(nameof(request.ProductSlug), "Choose the piece you want to reserve.");
            if (string.IsNullOrWhiteSpace(request.Color) || string.IsNullOrWhiteSpace(request.Size))
                throw ValidationException.For(nameof(request.Size), "Choose a colour and a size.");

            var variant = product.Variants.FirstOrDefault(v =>
                v.ColorName.Equals(request.Color.Trim(), StringComparison.OrdinalIgnoreCase) &&
                v.Size.Equals(request.Size.Trim(), StringComparison.OrdinalIgnoreCase));

            if (variant is null)
                throw ValidationException.For(nameof(request.Size), "That colour and size combination isn't made.");
            if (variant.Stock <= 0)
                throw ValidationException.For(nameof(request.Size), "That size is sold out in this colour. Choose another, or ask for made-to-measure.");
        }

        var order = new OrderRequest
        {
            Type = type,
            Name = request.Name.Trim(),
            Email = request.Email.Trim(),
            Phone = NullIfBlank(request.Phone),
            CompanyName = NullIfBlank(request.CompanyName),
            Country = NullIfBlank(request.Country),
            ProductId = product?.Id,
            ColorName = NullIfBlank(request.Color),
            Size = NullIfBlank(request.Size),
            Quantity = request.Quantity,
            Details = request.Details.Trim(),
            SourceIpHash = sourceIpHash
        };

        db.OrderRequests.Add(order);
        await db.SaveChangesAsync(ct);

        var reference = OrderReference(order.Id);
        logger.LogInformation("{Type} request {Reference} stored", type, reference);
        return new SubmissionResultDto(reference, OrderConfirmation(type));
    }

    public async Task<PagedResult<InquiryListItemDto>> ListAsync(string? kind, string? status, int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        InquiryStatus? statusFilter = ParseStatusOrNull(status);

        // Two small tables merged in memory after filtering; fine for an inbox.
        var items = new List<InquiryListItemDto>();

        if (kind is null or ContactKind)
        {
            var q = db.ContactInquiries.AsNoTracking();
            if (statusFilter is { } s) q = q.Where(x => x.Status == s);
            items.AddRange(await q.Select(x => new InquiryListItemDto(
                x.Id, ContactKind, "", x.Name, x.Email, x.CompanyName, x.Subject, x.Status.ToString(), x.CreatedAt))
                .ToListAsync(ct));
        }

        if (kind is null or OrderKind)
        {
            var q = db.OrderRequests.AsNoTracking();
            if (statusFilter is { } s) q = q.Where(x => x.Status == s);
            var rows = await q.Select(x => new
            {
                x.Id, x.Type, x.Name, x.Email, x.CompanyName, ProductName = x.Product != null ? x.Product.Name : null,
                x.Status, x.CreatedAt
            }).ToListAsync(ct);

            items.AddRange(rows.Select(x => new InquiryListItemDto(
                x.Id, OrderKind, "", x.Name, x.Email, x.CompanyName,
                x.ProductName is null ? x.Type.ToString() : $"{x.Type}: {x.ProductName}",
                x.Status.ToString(), x.CreatedAt)));
        }

        var ordered = items
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => i with { Reference = i.Kind == ContactKind ? ContactReference(i.Id) : OrderReference(i.Id) })
            .ToList();

        return new PagedResult<InquiryListItemDto>(
            ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList(), page, pageSize, ordered.Count);
    }

    public async Task UpdateStatusAsync(string kind, int id, UpdateInquiryStatusRequest request, CancellationToken ct)
    {
        var status = ParseStatusOrNull(request.Status)
            ?? throw ValidationException.For(nameof(request.Status), $"Status must be one of: {string.Join(", ", Enum.GetNames<InquiryStatus>())}.");

        switch (kind)
        {
            case ContactKind:
                var inquiry = await db.ContactInquiries.FindAsync([id], ct) ?? throw new NotFoundException("Contact inquiry", id);
                inquiry.Status = status;
                inquiry.InternalNotes = request.InternalNotes ?? inquiry.InternalNotes;
                break;
            case OrderKind:
                var order = await db.OrderRequests.FindAsync([id], ct) ?? throw new NotFoundException("Order request", id);
                order.Status = status;
                order.InternalNotes = request.InternalNotes ?? order.InternalNotes;
                break;
            default:
                throw ValidationException.For("kind", "Kind must be 'contact' or 'order'.");
        }

        await db.SaveChangesAsync(ct);
    }

    public static string ContactReference(int id) => $"MSG-{id:D6}";
    public static string OrderReference(int id) => $"REQ-{id:D6}";

    private static InquiryStatus? ParseStatusOrNull(string? value) =>
        Enum.TryParse<InquiryStatus>(value, ignoreCase: true, out var s) && Enum.IsDefined(s) ? s : null;

    private static string? NullIfBlank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
