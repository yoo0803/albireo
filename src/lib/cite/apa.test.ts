import { describe, expect, it } from "vitest";
import { authors, extractDois, formatApa, normalizeDoi } from "./apa";

describe("DOI", () => {
  it("정규화", () => {
    expect(normalizeDoi("https://doi.org/10.1038/nature12373")).toBe("10.1038/nature12373");
    expect(normalizeDoi("doi:10.1000/xyz123.")).toBe("10.1000/xyz123");
    expect(normalizeDoi("javascript:alert(1)")).toBeNull();
  });
  it("본문 DOI 추출 (중복 제거)", () => {
    expect(extractDois("[A](https://doi.org/10.1038/a) [B](https://dx.doi.org/10.1234/b) [A](https://doi.org/10.1038/a)")).toEqual(["10.1038/a", "10.1234/b"]);
  });
});

describe("APA 7", () => {
  it("저자 표기", () => {
    expect(authors([{ family: "Kim", given: "Min Ji" }])).toBe("Kim, M. J.");
    expect(authors([{ family: "Lee", given: "Jean-Paul" }, { family: "Park", given: "S." }])).toBe("Lee, J.-P., & Park, S.");
    const many = Array.from({ length: 22 }, (_, i) => ({ family: `A${i}`, given: "B" }));
    expect(authors(many)).toMatch(/A18, B\., \. \. \. A21, B\.$/);
  });
  it("학술지 논문", () => {
    const r = formatApa(
      { type: "journal-article", title: "Cell death", author: [{ family: "Smith", given: "John" }], issued: { "date-parts": [[2020, 1]] }, "container-title": "Nature", volume: "5", issue: "2", page: "10-20" },
      "10.1/x",
    );
    const text = r.parts.map((p) => p.t).join("");
    expect(text).toBe("Smith, J. (2020). Cell death. Nature, 5(2), 10–20. ");
    expect(r.parts.filter((p) => p.i).map((p) => p.t)).toEqual(["Nature", "5"]);
    expect(r.url).toBe("https://doi.org/10.1/x");
  });
  it("연도 없음", () => {
    expect(formatApa({ title: "X", author: [{ family: "Y", given: "Z" }] }, "10.1/y").parts[0].t).toContain("(n.d.)");
  });
});
