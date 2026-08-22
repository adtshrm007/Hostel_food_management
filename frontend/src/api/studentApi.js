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

  submitTodayPreferences: async (lunch, dinner) => {
    const response = await axiosInstance.put('/preference/today', { lunch, dinner });
    return response.data;
  },
};

export default studentApi;

