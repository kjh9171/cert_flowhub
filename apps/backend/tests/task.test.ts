// FlowHub 작업 통합 테스트

import request from "supertest";
import { app } from "../src/main";

describe("Tasks", () => {
  const email = `task_${Date.now()}@flowhub.local`;
  let token = "";
  let workspaceId = "";

  beforeAll(async () => {
    const res = await request(app).post("/api/auth/register").send({
      email,
      password: "password123",
      name: "작업테스터",
    });
    token = res.body.token;
    workspaceId = res.body.workspace?.id;
  });

  it("creates a task", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ workspaceId, title: "테스트 작업", priority: "HIGH" });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("테스트 작업");
  });

  it("lists tasks", async () => {
    const res = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .query({ workspaceId });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
