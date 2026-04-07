import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import './AddStaff.css';
import './TimeTable.css';

interface TimeTableProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: number | null;
  schoolId: number | null;
  sectionName: string;
  onSuccess: () => void;
}

interface Period {
  periodNumber: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

interface DayPeriod {
  periodId: number;
  subjectId: number;
}

interface Day {
  dayOfWeek: number;
  periods: DayPeriod[];
}

interface Subject {
  id: number;
  subjectName: string;
}

const TimeTable: React.FC<TimeTableProps> = ({ 
  isOpen, 
  onClose, 
  sectionId, 
  schoolId, 
  sectionName, 
  onSuccess 
}) => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    if (isOpen && schoolId && sectionId) {
      fetchData();
      initializeTimeTable();
    }
  }, [isOpen, schoolId, sectionId]);

  const fetchData = async () => {
    if (!schoolId) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // Fetch subjects
      const subjectsResponse = await fetch(`${API_BASE_URL}/api/Common/subjects/${schoolId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (subjectsResponse.ok) {
        const subjectsResult = await subjectsResponse.json();
        if (subjectsResult.success) setSubjects(subjectsResult.data);
      }
    } catch (err) {
      console.error('Failed to fetch data');
    }
  };

  const initializeTimeTable = () => {
    // Initialize default periods
    const defaultPeriods: Period[] = [
      { periodNumber: 1, startTime: '09:00', endTime: '09:45', isBreak: false },
      { periodNumber: 2, startTime: '09:45', endTime: '10:30', isBreak: false },
      { periodNumber: 3, startTime: '10:30', endTime: '10:45', isBreak: true },
      { periodNumber: 4, startTime: '10:45', endTime: '11:30', isBreak: false },
      { periodNumber: 5, startTime: '11:30', endTime: '12:15', isBreak: false },
      { periodNumber: 6, startTime: '12:15', endTime: '13:00', isBreak: false },
      { periodNumber: 7, startTime: '13:00', endTime: '13:45', isBreak: false }
    ];
    setPeriods(defaultPeriods);

    // Initialize days with empty periods
    const initialDays: Day[] = [];
    for (let day = 1; day <= 6; day++) {
      const dayPeriods: DayPeriod[] = defaultPeriods.map(period => ({
        periodId: period.periodNumber,
        subjectId: 0
      }));
      initialDays.push({ dayOfWeek: day, periods: dayPeriods });
    }
    setDays(initialDays);
  };

  const updatePeriod = (field: keyof Period, periodNumber: number, value: string | boolean) => {
    setPeriods(prev => prev.map(period => 
      period.periodNumber === periodNumber 
        ? { ...period, [field]: value }
        : period
    ));
  };

  const updateDayPeriod = (dayOfWeek: number, periodId: number, subjectId: number) => {
    setDays(prev => prev.map(day => 
      day.dayOfWeek === dayOfWeek 
        ? {
            ...day,
            periods: day.periods.map(period =>
              period.periodId === periodId
                ? { ...period, subjectId }
                : period
            )
          }
        : day
    ));
  };

  const addPeriod = () => {
    const newPeriodNumber = periods.length + 1;
    const newPeriod: Period = {
      periodNumber: newPeriodNumber,
      startTime: '14:00',
      endTime: '14:45',
      isBreak: false
    };
    setPeriods(prev => [...prev, newPeriod]);

    // Add this period to all days
    setDays(prev => prev.map(day => ({
      ...day,
      periods: [...day.periods, { periodId: newPeriodNumber, subjectId: 0 }]
    })));
  };

  const removePeriod = (periodNumber: number) => {
    setPeriods(prev => prev.filter(p => p.periodNumber !== periodNumber));
    setDays(prev => prev.map(day => ({
      ...day,
      periods: day.periods.filter(p => p.periodId !== periodNumber)
    })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionId || !schoolId) return;
    
    setError('');
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const requestData = {
        sectionId,
        periods: periods.map(p => ({
          ...p,
          startTime: p.startTime + ':00',
          endTime: p.endTime + ':00'
        })),
        days
      };

      const response = await fetch(`${API_BASE_URL}/api/Admin/save-timetable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.message || 'Failed to create timetable');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Time Table - ${sectionName}`}
      submitLabel={loading ? "Creating..." : "Create Time Table"}
      onCancel={() => {}}
      formId="timetable-form"
      size="large"
    >
      {error && <div className="error-message">{error}</div>}
      
      <form id="timetable-form" onSubmit={handleSubmit}>
        {/* Period Configuration */}
        <div className="form-group">
          <label>Configure Periods</label>
          <div className="periods-config">
            {periods.map((period) => (
              <div key={period.periodNumber} className="period-row">
                <span>Period {period.periodNumber}</span>
                <input
                  type="time"
                  value={period.startTime}
                  onChange={(e) => updatePeriod('startTime', period.periodNumber, e.target.value)}
                />
                <input
                  type="time"
                  value={period.endTime}
                  onChange={(e) => updatePeriod('endTime', period.periodNumber, e.target.value)}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={period.isBreak}
                    onChange={(e) => updatePeriod('isBreak', period.periodNumber, e.target.checked)}
                  />
                  Break
                </label>
                {periods.length > 1 && (
                  <button type="button" onClick={() => removePeriod(period.periodNumber)}>×</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addPeriod} className="btn btn-secondary">
              + Add Period
            </button>
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="timetable-container">
          <table className="timetable">
            <thead>
              <tr>
                <th>Day</th>
                {periods.map(period => (
                  <th key={period.periodNumber}>
                    {period.isBreak ? 'Break' : `Period ${period.periodNumber}`}
                    <br />
                    <small>{period.startTime}-{period.endTime}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day, dayIndex) => (
                <tr key={day.dayOfWeek}>
                  <td className="day-name">{dayNames[dayIndex]}</td>
                  {day.periods.map((dayPeriod) => {
                    const period = periods.find(p => p.periodNumber === dayPeriod.periodId);
                    return (
                      <td key={dayPeriod.periodId}>
                        {period?.isBreak ? (
                          <span className="break-cell">BREAK</span>
                        ) : (
                          <div className="period-cell">
                            <select
                              value={dayPeriod.subjectId}
                              onChange={(e) => updateDayPeriod(day.dayOfWeek, dayPeriod.periodId, Number(e.target.value))}
                            >
                              <option value={0}>Select Subject</option>
                              {subjects.map(subject => (
                                <option key={subject.id} value={subject.id}>
                                  {subject.subjectName}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>
    </Modal>
  );
};

export default TimeTable;