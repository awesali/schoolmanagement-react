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

interface TimeSlot {
  dayOfWeek: number;
  periodId: number;
  subjectId: number;
  subjectName: string | null;
}

interface TimeTableData {
  periods: (Period & { id: number; sectionId: number })[];
  slots: TimeSlot[];
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
  const [isExistingTimetable, setIsExistingTimetable] = useState(false);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    if (isOpen && schoolId && sectionId) {
      fetchData();
      fetchExistingTimeTable();
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

  const fetchExistingTimeTable = async () => {
    if (!sectionId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Timetable/get-timetable?sectionId=${sectionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.periods.length > 0) {
          setIsExistingTimetable(true);
          loadExistingData(result.data);
        } else {
          setIsExistingTimetable(false);
          initializeDefaultTimeTable();
        }
      } else {
        setIsExistingTimetable(false);
        initializeDefaultTimeTable();
      }
    } catch (err) {
      console.error('Failed to fetch existing timetable');
      initializeDefaultTimeTable();
    }
  };

  const initializeDefaultTimeTable = () => {
    // Initialize with at least 3 periods
    const defaultPeriods: Period[] = [
      { periodNumber: 1, startTime: '09:00', endTime: '09:45', isBreak: false },
      { periodNumber: 2, startTime: '09:45', endTime: '10:30', isBreak: false },
      { periodNumber: 3, startTime: '10:30', endTime: '11:15', isBreak: false }
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

  const loadExistingData = (data: TimeTableData) => {
    // Load periods
    const existingPeriods = data.periods.map(p => ({
      periodNumber: p.periodNumber,
      startTime: p.startTime.substring(0, 5), // Remove seconds
      endTime: p.endTime.substring(0, 5), // Remove seconds
      isBreak: p.isBreak
    }));
    setPeriods(existingPeriods);

    // Load days with slots
    const daysData: Day[] = [];
    for (let day = 1; day <= 6; day++) {
      const daySlots = data.slots.filter(slot => slot.dayOfWeek === day);
      const dayPeriods: DayPeriod[] = existingPeriods.map(period => {
        const slot = daySlots.find(s => s.periodId === period.periodNumber);
        return {
          periodId: period.periodNumber,
          subjectId: slot ? slot.subjectId : 0
        };
      });
      daysData.push({ dayOfWeek: day, periods: dayPeriods });
    }
    setDays(daysData);
  };

  const initializeTimeTable = () => {
    // Initialize default periods
    const defaultPeriods: Period[] = [
      { periodNumber: 1, startTime: '09:00', endTime: '09:45', isBreak: false },
      { periodNumber: 2, startTime: '09:45', endTime: '10:30', isBreak: false },
      { periodNumber: 3, startTime: '10:30', endTime: '10:45', isBreak: true },
      { periodNumber: 4, startTime: '10:45', endTime: '11:30', isBreak: false }
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
      
      // For update API, use direct field structure
      const requestData = isExistingTimetable ? {
        sectionId,
        schoolId,
        periods: periods.map(p => ({
          sectionId,
          periodNumber: p.periodNumber,
          startTime: p.startTime + ':00',
          endTime: p.endTime + ':00',
          isBreak: p.isBreak
        })),
        days
      } : {
        sectionId,
        schoolId,
        periods: periods.map(p => ({
          ...p,
          startTime: p.startTime + ':00',
          endTime: p.endTime + ':00'
        })),
        days
      };

      const apiUrl = isExistingTimetable 
        ? `${API_BASE_URL}/api/Timetable/update-timetable`
        : `${API_BASE_URL}/api/Timetable/save-timetable`;
      
      const method = isExistingTimetable ? 'PUT' : 'POST';

      const response = await fetch(apiUrl, {
        method,
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
        setError(result.message || `Failed to ${isExistingTimetable ? 'update' : 'create'} timetable`);
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
      submitLabel={loading ? (isExistingTimetable ? "Updating..." : "Creating...") : (isExistingTimetable ? "Update Time Table" : "Create Time Table")}
      onCancel={() => {}}
      formId="timetable-form"
      size="large"
    >
      {error && <div className="error-message">{error}</div>}
      
      <form id="timetable-form" onSubmit={handleSubmit}>
        {/* Timetable Grid */}
        <div className="timetable-container">
          <table className="timetable">
            <thead>
              <tr>
                <th>Day</th>
                {periods.map(period => (
                  <th key={period.periodNumber}>
                    <div className="period-header">
                      <div className="period-title">
                        {period.isBreak ? 'Break' : `Period ${period.periodNumber}`}
                        <button 
                          type="button" 
                          className="remove-period-btn"
                          onClick={() => removePeriod(period.periodNumber)}
                          title="Remove Period"
                        >
                          ×
                        </button>
                      </div>
                      <label className="break-checkbox">
                        <input
                          type="checkbox"
                          checked={period.isBreak}
                          onChange={(e) => updatePeriod('isBreak', period.periodNumber, e.target.checked)}
                        />
                        Break
                      </label>
                    </div>
                  </th>
                ))}
                <th>
                  <button 
                    type="button" 
                    onClick={addPeriod} 
                    className="add-period-btn"
                    title="Add Period"
                  >
                    + Add Period
                  </button>
                </th>
              </tr>
              <tr className="time-row">
                <th className="time-label">Time</th>
                {periods.map(period => (
                  <th key={`time-${period.periodNumber}`} className="time-config">
                    <div className="time-inputs">
                      <input
                        type="time"
                        value={period.startTime}
                        onChange={(e) => updatePeriod('startTime', period.periodNumber, e.target.value)}
                        title="Start Time"
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={period.endTime}
                        onChange={(e) => updatePeriod('endTime', period.periodNumber, e.target.value)}
                        title="End Time"
                      />
                    </div>
                  </th>
                ))}
                <th></th>
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
                  <td></td>
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