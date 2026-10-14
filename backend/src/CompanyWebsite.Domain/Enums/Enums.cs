namespace CompanyWebsite.Domain.Enums;

public enum MediaType
{
    Image,
    Video,
    Document,
    Model
}

public enum InquiryStatus
{
    New,
    InProgress,
    Answered,
    Closed,
    Spam
}

/// <summary>What a visitor is asking the atelier for.</summary>
public enum OrderRequestType
{
    /// <summary>Hold a piece in a given colour and size for collection or fitting.</summary>
    Reservation,
    /// <summary>A garment cut to the customer's measurements.</summary>
    MadeToMeasure,
    /// <summary>A shop or company ordering in quantity.</summary>
    Wholesale
}

public static class Roles
{
    public const string Admin = "Admin";
    public const string Editor = "Editor";
}
