// Teacher Exam Content: imports and dependencies
import React, { useEffect, useState } from "react";
import { LoadingButton, PageLoader } from "../components/Loader/Loader";
import { teacherRequest } from "./TeacherWorkspace";
import "./TeacherStudentContent.css";

// Data types and contracts
type TeachingOption = {
  sectionId: number;
  subjectId: number;
  className: string;
  sectionName: string;
  subjectName: string;
};
type Exam = { id: number; name: string };
type Resource = {
  id: number;
  examId: number;
  sectionId: number;
  subjectId: number;
  syllabus: string;
  resourceUrl?: string;
  isPublished: boolean;
};

// Main component and state
export default function TeacherExamContent() {
  const [options, setOptions] = useState<TeachingOption[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [examId, setExamId] = useState("");
  const [optionIndex, setOptionIndex] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [publish, setPublish] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Constants and helper functions
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [teaching, examOptions, saved] = await Promise.all([
        teacherRequest("/api/Teacher/teaching-options"),
        teacherRequest("/api/Teacher/exam-options"),
        teacherRequest("/api/Teacher/exam-resources"),
      ]);
      setOptions(teaching.data || []);
      setExams(examOptions.data || []);
      setResources(saved.data || []);
    } catch (failure: any) {
      setError(failure.message || "Unable to load exam preparation.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setExamId("");
    setOptionIndex("");
    setSyllabus("");
    setResourceUrl("");
    setPublish(true);
    setEditingId(null);
    setFormOpen(false);
  };
  const editResource = (resource: Resource) => {
    setEditingId(resource.id);
    setExamId(String(resource.examId));
    setOptionIndex(
      String(
        options.findIndex(
          (option) =>
            option.sectionId === resource.sectionId &&
            option.subjectId === resource.subjectId,
        ),
      ),
    );
    setSyllabus(resource.syllabus);
    setResourceUrl(resource.resourceUrl || "");
    setPublish(resource.isPublished);
    setError("");
    setFormOpen(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const option = options[Number(optionIndex)];
    if (optionIndex === "" || !option || !examId || !syllabus.trim()) {
      setError("Choose an exam and class, then enter the syllabus.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await teacherRequest("/api/Teacher/exam-resources", {
        method: "POST",
        body: JSON.stringify({
          examId: Number(examId),
          sectionId: option.sectionId,
          subjectId: option.subjectId,
          syllabus,
          resourceUrl,
          publish,
        }),
      });
      resetForm();
      await load();
    } catch (failure: any) {
      setError(failure.message || "Unable to save syllabus.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tw tsc exam-preparation-page">
      <section className="tw-hero">
        <div>
          <span className="tw-eyebrow">ACADEMICS</span>
          <h2>Exam preparation</h2>
          <p>
            Share the syllabus and preparation links with the classes you teach.
          </p>
        </div>
      </section>
      {error && (
        <div role="alert" className="tw-error">
          {error}
        </div>
      )}
      {loading && <PageLoader label="Loading exam preparation..." />}
      <section className="tw-panel">
        <div className="exam-preparation-heading">
          <h3>Exam syllabus</h3>
          <button
            type="button"
            className="btn btn-primary exam-preparation-add"
            onClick={() => {
              resetForm();
              setError("");
              setFormOpen(true);
            }}
          >
            Add syllabus
          </button>
        </div>
        {formOpen && (
          <form className="tsc-form exam-preparation-form" onSubmit={save}>
            <div className="tsc-form-head">
              <h3>{editingId === null ? "Add syllabus" : "Edit syllabus"}</h3>
              <button
                type="button"
                className="btn exam-preparation-add"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
            <label>
              Exam
              <select
                required
                value={examId}
                onChange={(event) => setExamId(event.target.value)}
              >
                <option value="">Choose exam</option>
                {exams.map((exam) => (
                  <option value={exam.id} key={exam.id}>
                    {exam.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Class and subject
              <select
                required
                value={optionIndex}
                onChange={(event) => setOptionIndex(event.target.value)}
              >
                <option value="">Choose class</option>
                {options.map((option, index) => (
                  <option
                    value={index}
                    key={`${option.sectionId}-${option.subjectId}`}
                  >
                    {option.className} - {option.sectionName} -{" "}
                    {option.subjectName}
                  </option>
                ))}
              </select>
            </label>
            <label className="tsc-full">
              Topics
              <textarea
                required
                value={syllabus}
                onChange={(event) => setSyllabus(event.target.value)}
                maxLength={4000}
                rows={4}
              />
            </label>
            <label className="tsc-full">
              Resource link
              <input
                type="url"
                value={resourceUrl}
                onChange={(event) => setResourceUrl(event.target.value)}
              />
            </label>
            <label className="tsc-check">
              <input
                type="checkbox"
                checked={publish}
                onChange={(event) => setPublish(event.target.checked)}
              />
              Publish now
            </label>
            <div className="exam-preparation-submit">
              <LoadingButton
                className="btn btn-primary exam-preparation-add"
                loading={saving}
                disabled={saving}
              >
                {editingId === null ? "Save syllabus" : "Save changes"}
              </LoadingButton>
            </div>
          </form>
        )}
        <div className="exam-preparation-list">
          <h4>Added syllabus</h4>
          {resources.length
            ? resources.map((resource) => {
                const option = options.find(
                  (item) =>
                    item.sectionId === resource.sectionId &&
                    item.subjectId === resource.subjectId,
                );
                return (
                  <article className="exam-preparation-item" key={resource.id}>
                    <div>
                      <strong>
                        {exams.find((exam) => exam.id === resource.examId)
                          ?.name || "Exam"}
                      </strong>
                      <span>
                        {option
                          ? `${option.className} · ${option.sectionName} · ${option.subjectName}`
                          : "Class and subject"}
                      </span>
                      <p>{resource.syllabus}</p>
                      {resource.resourceUrl && (
                        <a
                          href={resource.resourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open resource
                        </a>
                      )}
                      <small>
                        {resource.isPublished ? "Published" : "Draft"}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="btn exam-preparation-add"
                      onClick={() => editResource(resource)}
                    >
                      Edit
                    </button>
                  </article>
                );
              })
            : !loading && <p className="tw-empty">No syllabus added yet.</p>}
        </div>
      </section>
    </div>
  );
}
