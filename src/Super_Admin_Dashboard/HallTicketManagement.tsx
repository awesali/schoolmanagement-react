// Hall Ticket Management: imports and dependencies
import AdminActionIcon from "./AdminActionIcon";
import React, { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config";
import { PageLoader } from "../components/Loader/Loader";
import "./TeacherStudentContent.css";

// Data types and contracts
type Row = Record<string, any>;
type TicketForm = {
  classId: string;
  sectionId: string;
  studentId: string;
  examId: string;
  seatNumber: string;
  room: string;
  venue: string;
  documentUrl: string;
  publish: boolean;
};

// Constants and helper functions
const emptyForm: TicketForm = {
  classId: "",
  sectionId: "",
  studentId: "",
  examId: "",
  seatNumber: "",
  room: "",
  venue: "",
  documentUrl: "",
  publish: true,
};

// Main component and state
export default function HallTicketManagement({
  schoolId,
}: {
  schoolId: number;
}) {
  const [classes, setClasses] = useState<Row[]>([]);
  const [sections, setSections] = useState<Row[]>([]);
  const [students, setStudents] = useState<Row[]>([]);
  const [exams, setExams] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<TicketForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulk, setBulk] = useState({
    classId: "",
    examId: "",
    seatsPerRoom: "30",
    firstSeatNumber: "1",
    roomPrefix: "Room",
    venue: "",
    publish: true,
  });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Constants and helper functions
  const formRef = useRef<HTMLFormElement>(null);

  const request = async (path: string, options?: RequestInit) => {
    const response = await fetch(
      `${API_BASE_URL}/api/SchoolStudentAdmin${path}`,
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          ...options?.headers,
        },
      },
    );
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || "Request failed.");
    return body.data;
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [tickets, examOptions, options] = await Promise.all([
        request(`/hall-tickets?schoolId=${schoolId}`),
        request(`/exam-options?schoolId=${schoolId}`),
        request(`/hall-ticket-options?schoolId=${schoolId}`),
      ]);
      setRows(tickets || []);
      setExams(examOptions || []);
      setClasses(options?.classes || []);
      setSections(options?.sections || []);
      setStudents(options?.students || []);
    } catch (failure: any) {
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    setForm(emptyForm);
    setEditingId(null);
    setShowBulkForm(false);
    setNotice("");
    void load();
  }, [schoolId]);

  const bulkStudents = students.filter(
    (x) => String(x.classId) === bulk.classId,
  );
  const bulkExams = exams.filter((x) =>
    bulkStudents.some(
      (student) => Number(student.sessionId) === Number(x.sessionId),
    ),
  );
  const eligibleStudents = bulkStudents.filter(
    (student) =>
      Number(student.sessionId) ===
      Number(
        bulkExams.find((exam) => String(exam.id) === bulk.examId)?.sessionId,
      ),
  );
  const roomCount = Math.ceil(
    eligibleStudents.length / (Number(bulk.seatsPerRoom) || 1),
  );
  const classSections = sections.filter(
    (x) => String(x.classId) === form.classId,
  );
  const sectionStudents = students.filter(
    (x) =>
      String(x.classId) === form.classId &&
      String(x.sectionId) === form.sectionId,
  );
  const selectedStudent = sectionStudents.find(
    (x) => String(x.id) === form.studentId,
  );
  const studentExams = exams.filter(
    (x) =>
      selectedStudent &&
      Number(x.sessionId) === Number(selectedStudent.sessionId),
  );

  const edit = (ticket: Row) => {
    const student = students.find(
      (x) =>
        Number(x.id) === Number(ticket.studentId) &&
        Number(x.sessionId) === Number(ticket.sessionId),
    );
    if (!student) {
      setError(
        "This student has no active enrollment in the ticket exam session. Update their enrollment before editing.",
      );
      return;
    }
    setError("");
    setEditingId(Number(ticket.id));
    setShowBulkForm(false);
    setForm({
      classId: String(student.classId),
      sectionId: String(student.sectionId),
      studentId: String(ticket.studentId),
      examId: String(ticket.examId),
      seatNumber: ticket.seatNumber || "",
      room: ticket.room || "",
      venue: ticket.venue || "",
      documentUrl: ticket.documentUrl || "",
      publish: Boolean(ticket.isPublished),
    });
    formRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };
  const createClassTickets = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const seatsPerRoom = Number(bulk.seatsPerRoom);
      const firstSeat = Number(bulk.firstSeatNumber);
      if (
        !eligibleStudents.length ||
        !Number.isInteger(seatsPerRoom) ||
        seatsPerRoom < 1 ||
        !Number.isInteger(firstSeat) ||
        firstSeat < 1
      )
        throw new Error("Choose an exam and valid seat numbers.");
      const ordered = [...eligibleStudents].sort(
        (a, b) =>
          Number(a.sectionId) - Number(b.sectionId) ||
          String(a.rollNumber || "").localeCompare(
            String(b.rollNumber || ""),
            undefined,
            { numeric: true },
          ) ||
          Number(a.id) - Number(b.id),
      );
      let saved = 0;
      try {
        for (const [index, student] of ordered.entries()) {
          await request("/hall-tickets", {
            method: "POST",
            body: JSON.stringify({
              schoolId,
              classId: Number(bulk.classId),
              sectionId: Number(student.sectionId),
              studentId: Number(student.id),
              examId: Number(bulk.examId),
              room: `${bulk.roomPrefix.trim()} ${Math.floor(index / seatsPerRoom) + 1}`,
              seatNumber: String(firstSeat + (index % seatsPerRoom)),
              venue: bulk.venue,
              documentUrl: "",
              publish: bulk.publish,
            }),
          });
          saved++;
        }
      } catch (failure: any) {
        throw new Error(
          `${saved} of ${ordered.length} tickets saved. ${failure.message}`,
        );
      }
      setShowBulkForm(false);
      setNotice(
        `Created or updated ${saved} tickets across ${Math.ceil(saved / seatsPerRoom)} rooms.`,
      );
      await load();
    } catch (failure: any) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  };
  const deleteAll = async () => {
    if (
      !window.confirm(
        `Delete all ${rows.length} existing hall tickets for this school?`,
      )
    )
      return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await request(`/hall-tickets?schoolId=${schoolId}`, {
        method: "DELETE",
      });
      setEditingId(null);
      setShowBulkForm(false);
      setNotice(`Deleted ${result.count} hall tickets.`);
      await load();
    } catch (failure: any) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const path =
        editingId === null ? "/hall-tickets" : `/hall-tickets/${editingId}`;
      await request(path, {
        method: editingId === null ? "POST" : "PUT",
        body: JSON.stringify({
          ...form,
          schoolId,
          classId: Number(form.classId),
          sectionId: Number(form.sectionId),
          studentId: Number(form.studentId),
          examId: Number(form.examId),
        }),
      });
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (failure: any) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tw tsc">
      <section className="tw-hero">
        <div>
          <span className="tw-eyebrow">STUDENT SERVICES</span>
          <h2>Hall tickets</h2>
          <p>Assign exam seats and publish tickets for students.</p>
        </div>
      </section>
      {error && (
        <div className="tw-error" role="alert">
          {error}
        </div>
      )}
      {loading && <PageLoader label="Loading hall tickets…" />}
      {notice && (
        <div className="tw-panel" role="status">
          {notice}
        </div>
      )}
      <div className="tsc-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setEditingId(null);
            setShowBulkForm((open) => !open);
          }}
          disabled={saving}
        >
          <AdminActionIcon action={showBulkForm ? "close" : "add"} />
          {showBulkForm ? "Close class form" : "Create class tickets"}
        </button>
        {!!rows.length && (
          <button
            type="button"
            className="btn"
            onClick={deleteAll}
            disabled={saving || loading}
          >
            <AdminActionIcon action="delete" />
            Delete all existing tickets
          </button>
        )}
      </div>
      {showBulkForm && (
        <form className="tw-panel tsc-form" onSubmit={createClassTickets}>
          <div className="tsc-full tsc-form-heading">
            <h3>Create tickets for a class</h3>
          </div>
          <label>
            Class
            <select
              required
              value={bulk.classId}
              onChange={(e) =>
                setBulk({ ...bulk, classId: e.target.value, examId: "" })
              }
            >
              <option value="">Choose class</option>
              {classes.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.className}
                </option>
              ))}
            </select>
          </label>
          <label>
            Exam
            <select
              required
              disabled={!bulk.classId}
              value={bulk.examId}
              onChange={(e) => setBulk({ ...bulk, examId: e.target.value })}
            >
              <option value="">Choose exam</option>
              {bulkExams.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Seats per room
            <input
              required
              type="number"
              min="1"
              max="1000"
              value={bulk.seatsPerRoom}
              onChange={(e) =>
                setBulk({ ...bulk, seatsPerRoom: e.target.value })
              }
            />
          </label>
          <label>
            First seat number in each room
            <input
              required
              type="number"
              min="1"
              value={bulk.firstSeatNumber}
              onChange={(e) =>
                setBulk({ ...bulk, firstSeatNumber: e.target.value })
              }
            />
          </label>
          <label>
            Room name
            <input
              required
              maxLength={90}
              value={bulk.roomPrefix}
              onChange={(e) => setBulk({ ...bulk, roomPrefix: e.target.value })}
            />
          </label>
          <label>
            Venue
            <input
              maxLength={200}
              value={bulk.venue}
              onChange={(e) => setBulk({ ...bulk, venue: e.target.value })}
            />
          </label>
          <p className="tsc-full">
            The selected exam has {eligibleStudents.length} enrolled students.
            Tickets will fill {roomCount} rooms in section and roll-number
            order. Seat numbers restart in each room.
          </p>
          <label className="tsc-check">
            <input
              type="checkbox"
              checked={bulk.publish}
              onChange={(e) => setBulk({ ...bulk, publish: e.target.checked })}
            />
            Publish now
          </label>
          <button
            className="btn btn-primary"
            disabled={saving || loading || !eligibleStudents.length}
          >
            <AdminActionIcon action="add" />
            {saving
              ? "Creating..."
              : `Create ${eligibleStudents.length} tickets`}
          </button>
        </form>
      )}
      {editingId !== null && (
        <form ref={formRef} className="tw-panel tsc-form" onSubmit={save}>
          <div className="tsc-full tsc-form-heading">
            <h3>Edit hall ticket</h3>
            {editingId !== null && (
              <button type="button" className="btn" onClick={cancelEdit}>
                <AdminActionIcon action="close" />
                Cancel edit
              </button>
            )}
          </div>
          <label>
            Class
            <select
              required
              value={form.classId}
              onChange={(e) =>
                setForm({
                  ...form,
                  classId: e.target.value,
                  sectionId: "",
                  studentId: "",
                  examId: "",
                })
              }
            >
              <option value="">Choose class</option>
              {classes.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.className}
                </option>
              ))}
            </select>
          </label>
          <label>
            Section
            <select
              required
              disabled={!form.classId}
              value={form.sectionId}
              onChange={(e) =>
                setForm({
                  ...form,
                  sectionId: e.target.value,
                  studentId: "",
                  examId: "",
                })
              }
            >
              <option value="">Choose section</option>
              {classSections.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.sectionName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Student
            <select
              required
              disabled={!form.sectionId}
              value={form.studentId}
              onChange={(e) =>
                setForm({ ...form, studentId: e.target.value, examId: "" })
              }
            >
              <option value="">Choose student</option>
              {sectionStudents.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.studentName}
                  {x.rollNumber ? ` · Roll ${x.rollNumber}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Exam
            <select
              required
              disabled={!form.studentId}
              value={form.examId}
              onChange={(e) => setForm({ ...form, examId: e.target.value })}
            >
              <option value="">Choose exam</option>
              {studentExams.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          {form.studentId && !studentExams.length && (
            <p className="tsc-full tw-error">
              No exams found for this student's academic session.
            </p>
          )}
          <label>
            Seat number
            <input
              required
              maxLength={50}
              value={form.seatNumber}
              onChange={(e) => setForm({ ...form, seatNumber: e.target.value })}
            />
          </label>
          <label>
            Room
            <input
              required
              maxLength={100}
              value={form.room}
              onChange={(e) => setForm({ ...form, room: e.target.value })}
            />
          </label>
          <label className="tsc-full">
            Venue
            <input
              maxLength={200}
              placeholder="Exam centre or school address"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
            />
          </label>
          <label className="tsc-full">
            Ticket link
            <input
              type="url"
              value={form.documentUrl}
              onChange={(e) =>
                setForm({ ...form, documentUrl: e.target.value })
              }
            />
          </label>
          <label className="tsc-check">
            <input
              type="checkbox"
              checked={form.publish}
              onChange={(e) => setForm({ ...form, publish: e.target.checked })}
            />
            Publish now
          </label>
          <button className="btn btn-primary" disabled={saving || loading}>
            <AdminActionIcon action="save" />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}
      <section className="tsc-list">
        {rows.map((x) => (
          <article className="tw-panel tsc-record" key={x.id}>
            <h4>
              {x.studentName} · {x.examName}
            </h4>
            <p>
              Seat {x.seatNumber} · Room {x.room} · Venue{" "}
              {x.venue || "School address"} ·{" "}
              {x.isPublished ? "Published" : "Draft"}
            </p>
            <button type="button" className="btn" onClick={() => edit(x)}>
              <AdminActionIcon action="edit" />
              Edit ticket
            </button>
          </article>
        ))}
        {!loading && !rows.length && (
          <p className="tw-empty">No hall tickets yet.</p>
        )}
      </section>
    </div>
  );
}
