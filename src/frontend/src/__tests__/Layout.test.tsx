import { Layout } from "@/components/Layout";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

/**
 * Characterization of the shared shell's footer attribution.
 *
 * The footer copy was intentionally changed from a Caffeine attribution link to
 * a plain "Coded by Namit" line, so these tests assert the accepted footer:
 * no Caffeine attribution or caffeine.ai link remains, and "Namit" is rendered
 * in a bold element that is clearly visible.
 */
describe("Layout footer attribution", () => {
  it("renders 'Coded by Namit' with Namit in a bold element", () => {
    render(
      <Layout>
        <p>content</p>
      </Layout>,
    );

    const attribution = screen.getByTestId("footer.attribution_text");
    expect(attribution).toBeInTheDocument();
    expect(attribution).toHaveTextContent("Coded by Namit");

    const name = screen.getByText("Namit");
    expect(name.tagName).toBe("STRONG");
    expect(name).toBeVisible();
  });

  it("no longer shows any Caffeine attribution or caffeine.ai link", () => {
    const { container } = render(
      <Layout>
        <p>content</p>
      </Layout>,
    );

    expect(
      screen.queryByTestId("footer.attribution_link"),
    ).not.toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/caffeine/i);
    expect(container.querySelector('a[href*="caffeine.ai"]')).toBeNull();
  });

  it("renders the page content inside the main scroll area", () => {
    render(
      <Layout>
        <p>a protected child</p>
      </Layout>,
    );

    expect(screen.getByText("a protected child")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
