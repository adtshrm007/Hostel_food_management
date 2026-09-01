import axiosInstance from './axiosInstance';

export const studentApi = {
  getProfile: async () => {
    const response = await axiosInstance.get('/student/me');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await axiosInstance.patch('/student/profile', data);
    return response.data;
  },

  uploadAvatar: async (formData) => {
    const response = await axiosInstance.post('/student/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteAvatar: async () => {
    const response = await axiosInstance.delete('/student/profile/avatar');
    return response.data;
  },

  getWeeklyPreferences: async (weekStart = null) => {
    const params = weekStart ? { week_start: weekStart } : {};
    const response = await axiosInstance.get('/preference/weekly', { params });
    return response.data;
  },

  submitWeeklyPreferences: async (preferencesList, isFinal = false) => {
    const response = await axiosInstance.post('/preference/weekly', {
      preferences: preferencesList,
      is_final: isFinal,
    });
    return response.data;
  },

  getTodayPreferences: async () => {
    const response = await axiosInstance.get('/preference/today');
    return response.data;
  },

  getTodayWindowStatus: async () => {
    const response = await axiosInstance.get('/preference/today-window');
    return response.data;
  },

  getWeekWindowStatus: async (weekStartStr) => {
    const response = await axiosInstance.get(`/preference/week-window/${weekStartStr}`);
    return response.data;
  },

  submitTodayPreferences: async (lunch, dinner) => {
    const response = await axiosInstance.put('/preference/today', { lunch, dinner });
    return response.data;
  },
};

export default studentApi;
