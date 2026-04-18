import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';

interface Subject {
  subjectId: number;
  subjectName: string;
  examDate: string;
  startTime: string;
  endTime: string;
}

interface Section {
  sectionId: number;
  sectionName: string;
  subjects: Subject[];
}

interface ClassDetail {
  classId: number;
  className: string;
  sections: Section[];
}

interface ExamDetail {
  examId: number;
  examName: string;
  examType: string;
  startDate: string;
  endDate: string;
  classes: ClassDetail[];
}

interface ExamDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: number | null;
  examId: number | null;
  examName: string;
}

const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
const fmtTime = (t: string) => t.substring(0, 5);

const ExamDetailModal: React.FC<ExamDetailModalProps> = ({ isOpen, onClose, schoolId, examId, examName }) => {
  const [detail, setDetail] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && examId && schoolId) {
      fetchDetail();
    }
  }, [isOpen, examId, schoolId]);

  const fetchDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/Exam/Exam_detail?examId=${examId}&schoolId=${schoolId}`, {
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success && result.data) {
        setDetail(result.data);
      } else {
        setError(result.message || 'Failed to fetch exam details');
      }
    } catch {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDetail(null);
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Exam Detail: ${examName}`} size="large" showSubmit={false} showCancel={false}>
      {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}
      {error && <div className="error-message">{error}</div>}
      {detail && (
        <div style={{ padding: '0 28px 28px' }}>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
            <div><strong>Exam Name:</strong> {detail.examName}</div>
            <div><strong>Type:</strong> {detail.examType}</div>
            <div><strong>Start:</strong> {fmt(detail.startDate)}</div>
            <div><strong>End:</strong> {fmt(detail.endDate)}</div>
          </div>

          {detail.classes.map(cls => (
            <div key={cls.classId} style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#374151', marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>
                Class: {cls.className}
              </h3>
              {cls.sections.map(section => (
                <div key={section.sectionId} style={{ marginBottom: '16px', paddingLeft: '12px' }}>
                  <h4 style={{ color: '#6b7280', marginBottom: '8px', fontSize: '14px' }}>Section: {section.sectionName}</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f3f4f6' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Subject</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Exam Date</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Start Time</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>End Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.subjects.map(sub => (
                        <tr key={sub.subjectId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '10px 12px' }}>{sub.subjectName}</td>
                          <td style={{ padding: '10px 12px' }}>{fmt(sub.examDate)}</td>
                          <td style={{ padding: '10px 12px' }}>{fmtTime(sub.startTime)}</td>
                          <td style={{ padding: '10px 12px' }}>{fmtTime(sub.endTime)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default ExamDetailModal;
