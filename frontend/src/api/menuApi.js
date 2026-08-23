import axiosInstance from './axiosInstance';

export const menuApi = {
  getWeeklyMenu: async () => {
    const response = await axiosInstance.get('/menu/');
    return response.data;
  },
};

export default menuApi;
