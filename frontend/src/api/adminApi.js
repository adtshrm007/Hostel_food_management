import axiosInstance from './axiosInstance';

export const adminApi = {
  getMe: async () => {
    const response = await axiosInstance.get('/admin/me');
    return response.data;
  },

  getStudents: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.hostel) params.append('hostel', filters.hostel);

    const response = await axiosInstance.get(`/admin/students?${params.toString()}`);
    return response.data;
  },

  getStudentById: async (studentId) => {
    const response = await axiosInstance.get(`/admin/students/${studentId}`);
    return response.data;
  },

  getStudentPreferences: async (studentId) => {
    const response = await axiosInstance.get(`/admin/students/${studentId}/preferences`);
    return response.data;
  },

  updateStudentPreference: async (studentId, preferenceData) => {
    const response = await axiosInstance.put(`/preference/admin/${studentId}`, preferenceData);
    return response.data;
  },

  getDailySummary: async (params = {}) => {
    let url = '/admin/summary';
    if (typeof params === 'string') {
      url = `/admin/summary?target_date=${params}`;
    } else if (params && params.start_date && params.end_date) {
      url = `/admin/summary?start_date=${params.start_date}&end_date=${params.end_date}`;
    } else if (params && params.target_date) {
      url = `/admin/summary?target_date=${params.target_date}`;
    }
    const response = await axiosInstance.get(url);
    return response.data;
  },

  getPendingAdmins: async () => {
    const response = await axiosInstance.get('/admin/pending-admins');
    return response.data;
  },

  approveAdmin: async (adminId) => {
    const response = await axiosInstance.post(`/admin/approve-admin/${adminId}`);
    return response.data;
  },

  rejectAdmin: async (adminId) => {
    const response = await axiosInstance.delete(`/admin/reject-admin/${adminId}`);
    return response.data;
  },

  updateStudent: async (studentId, updateData) => {
    const response = await axiosInstance.put(`/admin/students/${studentId}`, updateData);
    return response.data;
  },

  deleteStudent: async (studentId, adminPassword) => {
    const response = await axiosInstance.post(`/admin/students/${studentId}/delete`, { admin_password: adminPassword });
    return response.data;
  },

  deleteStudentsBulk: async (studentIds, adminPassword) => {
    const response = await axiosInstance.post('/admin/students/bulk-delete', { student_ids: studentIds, admin_password: adminPassword });
    return response.data;
  },
};

export default adminApi;
