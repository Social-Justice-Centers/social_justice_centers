"use client";
import { API_BASE_URL } from '../config';
import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

const BRAND_BLUE = '#0284C7';
const BG_CREAM = '#FFFFFF';

const CreateUserPage = () => {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    birthday: '',
    password: '',
    role: 'employee',
    isFlexibleModel: false,
    isRegularModel: false
  });

  const [status, setStatus] = useState({ loading: false, message: '', error: false });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.isFlexibleModel && !formData.isRegularModel) {
      setStatus({ loading: false, message: 'חובה לבחור לפחות מודל עבודה אחד (גמיש או רגיל)', error: true });
      return;
    }

    setStatus({ loading: true, message: '', error: false });

    try {
      // The backend expects `username` as a required display name field
      const payload = { ...formData, username: formData.fullName };
      
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ loading: false, message: 'המשתמש נוצר בהצלחה!', error: false });
        setFormData({ 
          fullName: '', 
          phone: '', 
          email: '',
          birthday: '',
          password: '', 
          role: 'employee', 
          isFlexibleModel: false, 
          isRegularModel: false 
        }); 
      } else {
        setStatus({ loading: false, message: data.error || res.statusText, error: true });
      }
    } catch {
      setStatus({ loading: false, message: 'תקלה בתקשורת עם השרת', error: true });
    }
  };

  const inputClass = "w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0284C7] bg-white text-gray-800 text-right";
  const labelClass = "block text-sm font-bold text-gray-700 mb-2 text-right";

  return (
    <div style={{ backgroundColor: BG_CREAM }} className="min-h-screen flex items-center justify-center p-4 relative" dir="rtl">
      
       <button
              onClick={() => router.push('/Manager')}
              className="absolute top-6 right-6 flex items-center gap-2 text-[#0284C7] font-bold hover:text-green-800 transition-colors z-10"
            >
              <ArrowRight size={24} />
              <span>חזרה</span>
        </button>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-8">יצירת משתמש חדש</h1>

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          
          <div>
            <label className={labelClass}>שם מלא</label>
            <input
              type="text"
              name="fullName"
              placeholder="שם מלא"
              value={formData.fullName}
              onChange={handleChange}
              required
              className={inputClass}
              autoComplete="off"
            />
          </div>

          <div>
            <label className={labelClass}>מספר טלפון (שם משתמש)</label>
            <input
              type="tel"
              name="phone"
              placeholder="מספר טלפון"
              value={formData.phone}
              onChange={handleChange}
              required
              dir="ltr"
              style={{ textAlign: 'right' }}
              className={inputClass}
              autoComplete="off"
            />
          </div>

          <div>
            <label className={labelClass}>*אימייל - חובה לצורך קבלת קוד כניסה</label>
            <input
              type="email"
              name="email"
              placeholder="example@gmail.com"
              value={formData.email}
              onChange={handleChange}
              required
              className={inputClass}
              autoComplete="off"
              dir="ltr"
              style={{ textAlign: 'right' }}
            />
          </div>

          <div>
            <label className={labelClass}>תאריך לידה</label>
            <input
              type="text"
              name="birthday"
              placeholder="DD/MM/YYYY"
              value={formData.birthday}
              onChange={handleChange}
              className={inputClass}
              autoComplete="off"
            />
          </div>

          <div>
            <label className={labelClass}>סיסמה</label>
            <input
              type="password"
              name="password"
              placeholder="******"
              value={formData.password}
              onChange={handleChange}
              required
              className={inputClass}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className={labelClass}>תפקיד במערכת</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="employee">עובד רגיל</option>
              <option value="manager">מנהל</option>
            </select>
          </div>

          <div className="flex gap-4 items-center justify-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="font-bold text-gray-700">מודל גמיש</span>
              <input
                type="checkbox"
                name="isFlexibleModel"
                checked={formData.isFlexibleModel}
                onChange={handleChange}
                className="w-5 h-5 accent-[#0284C7]"
              />
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="font-bold text-gray-700">מודל רגיל</span>
              <input
                type="checkbox"
                name="isRegularModel"
                checked={formData.isRegularModel}
                onChange={handleChange}
                className="w-5 h-5 accent-[#0284C7]"
              />
            </label>
          </div>

          {status.message && (
            <div className={`text-center p-3 rounded-lg text-sm font-bold ${status.error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {status.message}
            </div>
          )}

          <button
            type="submit"
            disabled={status.loading}
            className="w-full h-12 rounded-xl text-white font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50 mt-4"
            style={{ backgroundColor: BRAND_BLUE }}
          >
            {status.loading ? 'שומר...' : 'צור משתמש'}
          </button>

        </form>
      </div>
    </div>
  );
};

export default CreateUserPage;