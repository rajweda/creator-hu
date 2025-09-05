import request from "supertest";
import http from "http";
import app from "./server";

describe("Backend Smoke Test", () => {
  let server: http.Server;

  beforeAll((done) => {
    server = app.listen(4001, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  it("should respond to GET /", async () => {
    const res = await request(server).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("Creator Hub Backend Running");
  });

  it("should register a new user", async () => {
    const res = await request(server)
      .post("/api/users/register")
      .send({ name: "testuser", password: "testpass" });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("user");
    expect(res.body).toHaveProperty("token");
  });

  it("should not register an existing user", async () => {
    await request(server)
      .post("/api/users/register")
      .send({ name: "testuser", password: "testpass" });
    const res = await request(server)
      .post("/api/users/register")
      .send({ name: "testuser", password: "testpass" });
    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty("error");
  });

  it("should not register with missing fields", async () => {
    const res = await request(server)
      .post("/api/users/register")
      .send({ name: "" });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("should not login with missing password", async () => {
    const res = await request(server)
      .post("/api/users/login")
      .send({ name: "loginuser" });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("should login with correct credentials", async () => {
    await request(server)
      .post("/api/users/register")
      .send({ name: "loginuser", password: "loginpass" });
    const res = await request(server)
      .post("/api/users/login")
      .send({ name: "loginuser", password: "loginpass" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("user");
    expect(res.body).toHaveProperty("token");
  });

  it("should not login with incorrect credentials", async () => {
    const res = await request(server)
      .post("/api/users/login")
      .send({ name: "loginuser", password: "wrongpass" });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("error");
  });
});

describe("Content Endpoints", () => {
  let server: http.Server;
  let token: string;
  let contentId: string;

  beforeAll(async () => {
    server = app.listen(4002);
    // Register and login a user to get a token
    await request(server)
      .post("/api/users/register")
      .send({ name: "contentuser", password: "contentpass" });
    const res = await request(server)
      .post("/api/users/login")
      .send({ name: "contentuser", password: "contentpass" });
    token = res.body.token;
  });

  afterAll(() => {
    server.close();
  });

  it("should get all contents (empty initially)", async () => {
    const res = await request(server).get("/api/contents");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should create a new content", async () => {
    const res = await request(server)
      .post("/api/contents")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Test Content", sourceLink: "http://example.com", tags: ["test"] });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
    contentId = res.body.id;
  });

  it("should get content by id", async () => {
    const res = await request(server).get(`/api/contents/${contentId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("id", contentId);
  });

  it("should return 404 for non-existent content id", async () => {
    const res = await request(server).get("/api/contents/999999");
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("should update content", async () => {
    const res = await request(server)
      .put(`/api/contents/${contentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Updated Content" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("title", "Updated Content");
  });

  it("should not update content without token", async () => {
    const res = await request(server)
      .put(`/api/contents/${contentId}`)
      .send({ title: "No Auth Update" });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("should delete content", async () => {
    const res = await request(server)
      .delete(`/api/contents/${contentId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(204);
  });

  it("should not create content without token", async () => {
    const res = await request(server)
      .post("/api/contents")
      .send({ title: "No Auth", sourceLink: "http://example.com" });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("error");
  });
  it("should not delete content without token", async () => {
    const res = await request(server)
      .delete(`/api/contents/${contentId}`);
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("error");
  });
});