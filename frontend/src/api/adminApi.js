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
    if (filters.skip !== undefined && filters.skip !== null) params.append('skip', filters.skip);
    if (filters.limit !== undefined && filters.limit !== null) params.append('limit', filters.limit);

    const response = await axiosInstance.get(`/admin/students?${params.toString()}`);
    return response.data;
  },

  getStudentsCount: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.hostel) params.append('hostel', filters.hostel);

    const response = await axiosInstance.get(`/admin/students-count?${params.toString()}`);
    return response.data;
  },

  getStudentById: async (regNumberOrId) => {
    const response = await axiosInstance.get(`/admin/students/${regNumberOrId}`);
    return response.data;
  },

  getStudentPreferences: async (regNumberOrId) => {
    const response = await axiosInstance.get(`/admin/students/${regNumberOrId}/preferences`);
    return response.data;
  },

  updateStudentPreference: async (regNumberOrId, preferenceData) => {
    const response = await axiosInstance.put(`/preference/admin/${regNumberOrId}`, preferenceData);
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

  getAllAdmins: async () => {
    const response = await axiosInstance.get('/admin/all-admins');
    return response.data;
  },

  approveAdmin: async (usernameOrId) => {
    const response = await axiosInstance.post(`/admin/approve-admin/${usernameOrId}`);
    return response.data;
  },

  rejectAdmin: async (usernameOrId) => {
    const response = await axiosInstance.delete(`/admin/reject-admin/${usernameOrId}`);
    return response.data;
  },

  updateStudent: async (regNumberOrId, updateData) => {
    const response = await axiosInstance.put(`/admin/students/${regNumberOrId}`, updateData);
    return response.data;
  },

  deleteStudent: async (regNumberOrId, adminPassword) => {
    const response = await axiosInstance.post(`/admin/students/${regNumberOrId}/delete`, { admin_password: adminPassword });
    return response.data;
  },

  deleteStudentsBulk: async (rollNumbers, adminPassword) => {
    // Backend now accepts roll_numbers for bulk delete
    const payload = { roll_numbers: rollNumbers, admin_password: adminPassword };
    const response = await axiosInstance.post('/admin/students/bulk-delete', payload);
    return response.data;
  },

  deletePreference: async (regNumberOrId, preferenceId) => {
    const response = await axiosInstance.delete(`/admin/students/${regNumberOrId}/preferences/${preferenceId}`);
    return response.data;
  },

  clearAllPreferences: async (regNumberOrId) => {
    const response = await axiosInstance.delete(`/admin/students/${regNumberOrId}/preferences`);
    return response.data;
  },

  importStudents: async (formData) => {
    const response = await axiosInstance.post('/admin/students/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteAdmin: async (usernameOrId, adminPassword) => {
    const response = await axiosInstance.post(`/admin/admins/${usernameOrId}/delete`, { admin_password: adminPassword });
    return response.data;
  },

  getWindowOverride: async (targetDate) => {
    const url = targetDate ? `/admin/window-override?target_date=${targetDate}` : '/admin/window-override';
    const response = await axiosInstance.get(url);
    return response.data;
  },

  toggleWindowOverride: async (targetDate) => {
    const url = targetDate ? `/admin/window-override?target_date=${targetDate}` : '/admin/window-override';
    const response = await axiosInstance.post(url);
    return response.data;
  },

  batchWindowOverride: async ({ scope, action, dates }) => {
    const response = await axiosInstance.post('/admin/window-override/batch', {
      scope,
      action,
      dates,
    });
    return response.data;
  },

  uploadStudentAvatar: async (rollNumberOrId, formData) => {
    const response = await axiosInstance.post(`/admin/students/${rollNumberOrId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteStudentAvatar: async (rollNumberOrId) => {
    const response = await axiosInstance.delete(`/admin/students/${rollNumberOrId}/avatar`);
    return response.data;
  },
};


export default adminApi;
