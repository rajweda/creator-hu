import { render, screen, waitFor } from "@testing-library/react";
import Feed from "./Feed";

// Mock fetch
beforeEach(() => {
  global.fetch = jest.fn();
});
afterEach(() => {
  jest.resetAllMocks();
});

test("renders loading state", () => {
  (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
  render(<Feed />);
  expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
});

test("renders error state", async () => {
  (fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ error: "Failed to fetch" }) });
  render(<Feed />);
  await waitFor(() => expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument());
});

test("renders content list", async () => {
  (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ([{ id: 1, title: "Test Title", sourceLink: "http://example.com", tags: ["tag1"] }]) });
  render(<Feed />);
  await waitFor(() => expect(screen.getByText(/Test Title/i)).toBeInTheDocument());
  expect(screen.getByText(/http:\/\/example.com/i)).toBeInTheDocument();
  expect(screen.getByText(/Tags: tag1/i)).toBeInTheDocument();
});