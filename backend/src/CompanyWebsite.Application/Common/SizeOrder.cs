namespace CompanyWebsite.Application.Common;

/// <summary>Orders garment sizes the way people read them: XS, S, M, L… then numeric waist sizes.</summary>
public static class SizeOrder
{
    private static readonly string[] Letters = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"];

    public static int Rank(string size)
    {
        var s = size.Trim().ToUpperInvariant();
        var letter = Array.IndexOf(Letters, s);
        if (letter >= 0) return letter;
        if (int.TryParse(s, out var n)) return 100 + n; // 28, 30, 32… after letters
        return 1000; // "One size" and anything else last
    }

    public static IReadOnlyList<string> Sort(IEnumerable<string> sizes) =>
        sizes.Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(Rank).ThenBy(s => s).ToList();
}
