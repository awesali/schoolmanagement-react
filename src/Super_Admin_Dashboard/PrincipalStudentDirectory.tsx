import React, { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config";
import NameSearchBar from "./NameSearchBar";

type Student = { id: number; studentName: string; className: string; sectionName: string };
export default function PrincipalStudentDirectory() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const request = useRef(0);
  const searchAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    void search("");
    return () => { request.current++; searchAbort.current?.abort(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const search = async (term: string, nextPage = 1) => {
    const sequence = ++request.current;
    searchAbort.current?.abort();
    const controller = new AbortController();
    searchAbort.current = controller;
    setName(term); setPage(nextPage); setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/principal/students?search=${encodeURIComponent(term)}&page=${nextPage}&pageSize=20`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const result = await response.json();
      if (sequence !== request.current) return;
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to search students.");
      setStudents(result.data); setPages(result.totalPages);
    } catch (failure) {
      if (sequence === request.current && !controller.signal.aborted) { setStudents([]); setError(failure instanceof Error ? failure.message : "Unable to search students."); }
    } finally { if (sequence === request.current) setLoading(false); }
  };
  return <div>
    <NameSearchBar label="Search students by name" loading={loading} onSearch={(term) => void search(term)} />
    {error && <p role="alert">{error}</p>}
    {!loading && !error && (students.length ? <div className="principal-table-scroll"><table>
      <thead><tr><th>Student name</th><th>Class</th><th>Section</th></tr></thead>
      <tbody>{students.map((student) => <tr key={student.id}><td>{student.studentName}</td><td>{student.className}</td><td>{student.sectionName}</td></tr>)}</tbody>
    </table></div> : <p>{name ? "No students match that name." : "No students available."}</p>)}
    {pages > 1 && <nav aria-label="Student search pages">
      <button disabled={loading || page === 1} onClick={() => void search(name, page - 1)}>Previous</button>
      <span> Page {page} of {pages} </span>
      <button disabled={loading || page === pages} onClick={() => void search(name, page + 1)}>Next</button>
    </nav>}
  </div>;
}
