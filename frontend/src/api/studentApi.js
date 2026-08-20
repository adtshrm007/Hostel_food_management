import axiosInstance from './axiosInstance';

export const studentApi = {
  getProfile: async () => {
    const response = await axiosInstance.get('/student/me');
    return response.data;
  },

  getWeeklyPreferences: async () => {
    const response = await axiosInstance.get('/preference/weekly');
    return response.data;
  },

  submitWeeklyPreferences: async (preferencesList) => {
    const response = await axiosInstance.post('/preference/weekly', {
      preferences: preferencesList,
    });
    return response.data;
  },

  getTodayPreferences: async () => {
    const response = await axiosInstance.get('/preference/today');
    return response.data;
  },
};

export default studentApi;
