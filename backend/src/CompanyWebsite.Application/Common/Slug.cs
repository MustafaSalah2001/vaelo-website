using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace CompanyWebsite.Application.Common;

public static partial class Slug
{
    /// <summary>Builds a URL-safe, lowercase slug: "Aeris T-40 Turbofan" → "aeris-t-40-turbofan".</summary>
    public static string From(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;

        var normalized = input.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        foreach (var c in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }

        var ascii = sb.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
        var slug = NonAlphanumeric().Replace(ascii, "-").Trim('-');
        return slug.Length > 120 ? slug[..120].TrimEnd('-') : slug;
    }

    public static bool IsValid(string slug) => ValidSlug().IsMatch(slug);

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonAlphanumeric();

    [GeneratedRegex("^[a-z0-9]+(?:-[a-z0-9]+)*$")]
    private static partial Regex ValidSlug();
}
