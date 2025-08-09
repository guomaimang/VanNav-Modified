import axios from "axios";
import { message } from "antd";

// 设置默认的Authorization header
const token = window.localStorage.getItem("_token");
if (token) {
  axios.defaults.headers.common.Authorization = token;
}

// 添加响应拦截器来处理JWT验证失败的情况
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 检查是否是401错误（未授权）
    if (error.response?.status === 401) {
      // 清除本地存储的用户信息和token
      window.localStorage.removeItem("_user");
      window.localStorage.removeItem("_token");
      
      // 清除axios默认header
      delete axios.defaults.headers.common.Authorization;
      
      // 显示错误消息
      message.error("登录已过期，请重新登录");
      
      // 跳转到登录页面
      window.location.href = "/admin/login";
    }
    
    return Promise.reject(error);
  }
);
export const login = async (username: string, password: string) => {
  const { data } = await axios.post("/api/login", {
    name: username,
    password,
  });
  return data;
};

export const fetchTools: () => Promise<any> = async () => {
  const { data } = await axios.get("/api/admin/all");
  return data?.data || {};
};
export const fetchImportTools = async (payload: any) => {
  const { data } = await axios.post(`/api/admin/importTools`, payload);
  return data?.data || {};
};
export const fetchExportTools = async () => {
  const { data } = await axios.get(`/api/admin/exportTools`);
  return data?.data;
};
// 工具管理接口：删除、修改、新增
export const fetchDeleteTool = async (id: number) => {
  const { data } = await axios.delete(`/api/admin/tool/${id}`);
  return data?.data || {};
};
export const fetchUpdateTool = async (payload: any) => {
  const { data } = await axios.put(`/api/admin/tool/${payload.id}`, payload);
  return data?.data || {};
};
export const fetchAddTool = async (payload: any) => {
  const { data } = await axios.post(`/api/admin/tool`, payload);
  return data?.data || {};
};
// 分类管理接口；新增、修改、删除
export const fetchAddCateLog = async (payload: any) => {
  const { data } = await axios.post(`/api/admin/catelog`, payload);
  return data?.data || {};
};
export const fetchUpdateCateLog = async (payload: any) => {
  const { data } = await axios.put(`/api/admin/catelog/${payload.id}`, payload);
  return data?.data || {};
};
export const fetchDeleteCatelog = async (id: number) => {
  const { data } = await axios.delete(`/api/admin/catelog/${id}`);
  return data?.data || {};
};

export const fetchUpdateSetting = async (payload: any) => {
  const { data } = await axios.put(`/api/admin/setting`, payload);
  return data?.data || {};
};

export const fetchUpdateUser = async (payload: any) => {
  const { data } = await axios.put(`/api/admin/user`, payload);
  return data?.data || {};
};

export const fetchAddApiToken = async (payload: any) => {
  const { data } = await axios.post(`/api/admin/apiToken`, payload);
  return data?.data || {};
};
export const fetchDeleteApiToken = async (id: number) => {
  const { data } = await axios.delete(`/api/admin/apiToken/${id}`);
  return data?.data || {};
};

// IP白名单相关API
export const fetchWhiteIPs = async () => {
  const { data } = await axios.get(`/api/admin/whiteip`);
  return data?.data || [];
};

export const fetchAddWhiteIP = async (payload: any) => {
  const { data } = await axios.post(`/api/admin/whiteip`, payload);
  return data?.data || {};
};

export const fetchDeleteWhiteIP = async (id: number) => {
  const { data } = await axios.delete(`/api/admin/whiteip/${id}`);
  return data?.data || {};
};

// export const getImg = async (url: string) => {
//   const { data } = await axios.get(`/api/img?url=${url}`);
//   console.log(data)
//   return data;
// }