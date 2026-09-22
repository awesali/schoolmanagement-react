import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TeacherPortal from "./TeacherPortal";

beforeEach(() => {
  localStorage.setItem("token", "teacher-token");
  global.fetch = jest.fn(async (input, init) => {
    const url = String(input);
    if (url.includes("teaching-options")) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              sectionId: 7,
              sectionName: "A",
              className: "8",
              subjectId: 4,
              subjectName: "Mathematics",
            },
          ],
        }),
      } as Response;
    }
    if (url.endsWith("/api/Teacher/homework") && init?.method === "POST") {
      return {
        ok: true,
        json: async () => ({ success: true, data: { id: 1 } }),
      } as Response;
    }
    return {
      ok: true,
      json: async () => ({ success: true, data: [] }),
    } as Response;
  });
});

test("publishes homework only against one of the teacher's assigned class subjects", async () => {
  render(
    <TeacherPortal
      page="Homework & Assignments"
      onNavigate={jest.fn()}
    />,
  );

  const createButton = await screen.findByRole("button", {
    name: "+ New assignment",
  });
  await waitFor(() => expect(createButton).toBeEnabled());
  fireEvent.click(createButton);
  fireEvent.change(screen.getByLabelText("Class and subject"), {
    target: { value: "0" },
  });
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "Fractions practice" },
  });
  fireEvent.change(screen.getByLabelText("Instructions"), {
    target: { value: "Complete questions 1 to 10." },
  });
  fireEvent.change(screen.getByLabelText("Due date"), {
    target: { value: "2099-01-02T09:00" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Publish assignment" }));

  await waitFor(() => {
    const post = (global.fetch as jest.Mock).mock.calls.find(
      ([url, options]) =>
        String(url).endsWith("/api/Teacher/homework") &&
        options?.method === "POST",
    );
    expect(post).toBeTruthy();
    expect(JSON.parse(post[1].body)).toEqual(
      expect.objectContaining({ sectionId: 7, subjectId: 4 }),
    );
  });
});
