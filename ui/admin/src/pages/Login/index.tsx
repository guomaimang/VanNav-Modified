import "./index.css";
import { useNavigate } from "react-router-dom";
import { useCallback, useContext, useEffect } from "react";
import { GlobalContext } from "../../components/GlobalContext";
import { login as fetchLogin } from "../../utils/api";
import { Button, Form, Input, message } from "antd";
import { getLoginState } from "../../utils";
import axios from "axios";
import { config } from "../../config";
export interface LoginProps {}
export const Login: React.FC<LoginProps> = (props) => {
  const navigate = useNavigate();
  const { store, setStore } = useContext(GlobalContext);
  const login = useCallback(
    async (username: string, password: string) => {
      const data = await fetchLogin(username, password);
      if (data.success) {
        const { user, token } = data.data;
        window.localStorage.setItem("_token", token);
        window.localStorage.setItem("_user", user);
        setStore({ ...store, user });
        axios.defaults.headers.common.Authorization = token;
        message.success("登录成功!");
        navigate("/");
      } else {
        message.error(data.errorMessage ?? "登录失败!");
      }
    },
    [setStore, store]
  );
  useEffect(() => {
    const hasLogin = getLoginState();
    if (hasLogin) {
      navigate("/");
    }
  });
  return (
    <>
      <div className="login-page">
        <div className="login-box">
          <div
            className="logo"
            style={{  display: "flex", alignItems: "center",justifyContent:"center",marginBottom: 30,fontSize: 18,fontWeight:500 }}
          >
            <img src={config.logoUrl} alt="logo" style={{ width: 50, height: 50 }} />
            <span style={{ marginLeft: 8, fontSize: 18 }}>{config.title}</span>
          </div>
          <Form
            onFinish={(values) => {
              login(values.username, values.password);
            }}
            autoComplete="on"
          >
            <Form.Item name="username" required label="账号">
              <Input placeholder="默认: admin" />
            </Form.Item>
            <Form.Item name="password" required label="密码">
              <Input.Password placeholder="默认: admin" />
            </Form.Item>
            <Form.Item>
              <Button
                htmlType="submit"
                type="primary"
                style={{ width: "100%" }}
              >
                登录
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </>
  );
};
