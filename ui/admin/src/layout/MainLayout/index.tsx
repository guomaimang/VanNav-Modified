import "./index.css";
import { Layout, Menu } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { config } from "../../config";
import { logout } from "../../utils";
import { useContext, useEffect } from "react";
import { GlobalContext } from "../../components/GlobalContext";
const { Header, Content, Sider } = Layout;
export interface MainLayoutProps { children: React.ReactNode | React.ReactNode[] }
export const MainLayout: React.FC<MainLayoutProps> = (props) => {
  const nav = useNavigate();
  const { store, reload } = useContext(GlobalContext);
  const location = useLocation();

  useEffect(() => {
    if (!store.catelogs) {
      reload();
    }
  }, [store]);
  return (
    <Layout className="main" >
      <Header className="header" style={{ position: 'sticky', top: 0, zIndex: 1, width: '100%' }}>
        <div className="logo" style={{ color: "white", display: "flex", alignItems: "center" }}>
          <img src={config.logoUrl} alt="logo" style={{ width: 50, height: 50 }} />
          <span style={{ marginLeft: 8, fontSize: 18 }}>{config.title}</span>
        </div>
        <div style={{ display: "flex" }}>
          <a
            className="logout"
            href={"/"}
            target={"_blank"}
            style={{ marginRight: 16, color: "white" }}
          >
            主站
          </a>
          <div
            className="logout"
            onClick={() => {
              logout();
              nav("/login");
            }}
          >
            退出登录
          </div>
        </div>
      </Header>
      <Layout>
        <Sider width={200} className="site-layout-background">
          <Menu

            mode="inline"
            selectedKeys={[
              location.pathname === "/" ? "/tools" : location.pathname,
            ]}
            onClick={(info) => {
              nav(info.key);
            }}
            style={{
              overflow: 'auto',
              marginTop: 64,
              height: '100%',
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              width: 200
            }}
          >
            <Menu.Item key="/tools">工具管理</Menu.Item>
            <Menu.Item key="/catelogs">分类管理</Menu.Item>
            <Menu.Item key="/tokens">API Token</Menu.Item>
            <Menu.Item key="/whiteip">IP白名单</Menu.Item>
            <Menu.Item key="/settings">系统设置</Menu.Item>
          </Menu>
        </Sider>
        <Layout style={{ padding: "0 24px 24px" }}>
          <Content
            className="site-layout-background"
            style={{
              padding: 0,
              paddingTop: 24,
              margin: 0,
              minHeight: 280,
            }}
          >
            {props.children}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};
