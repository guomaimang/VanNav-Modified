import { Button, Card, Form, Input, Modal, message, Popconfirm, Space, Spin, Table, Typography } from 'antd';
import { useCallback, useContext, useState } from 'react';
import { GlobalContext } from '../../components/GlobalContext';
import { fetchAddWhiteIP, fetchDeleteWhiteIP } from '../../utils/api';
import './index.css'

export interface WhiteIPProps  {
}

export const WhiteIP: React.FC<WhiteIPProps> = (props) => {
  const { reload, store, loading } = useContext(GlobalContext); 
  const [addForm] = Form.useForm();
  const [showAddModel, setShowAddModel] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);

  // 删除白名单IP
  const handleDelete = useCallback(
    async (id: number) => {
      setRequestLoading(true);
      try {
        await fetchDeleteWhiteIP(id);
        message.success("删除成功!");
        reload(); // 重新加载列表
      } catch (err) {
        message.warning("删除失败!");
      } finally {
        setRequestLoading(false);
      }
    },
    [reload]
  );

  // 添加白名单IP
  const handleCreate = useCallback(
    async (record: any) => {
      setRequestLoading(true);
      try {
        await fetchAddWhiteIP(record);
        message.success("添加成功!");
        reload(); // 重新加载列表
        setShowAddModel(false);
        addForm.resetFields();
      } catch (err) {
        message.warning("添加失败!");
      } finally {
        setRequestLoading(false);
      }
    },
    [reload, setShowAddModel, addForm]
  );

  return (
    <Card
      title={`IP白名单（当前共 ${store?.whiteIPs?.length ?? 0} 条）`}
      extra={
        <Space>
          <Button
            type="primary"
            onClick={() => {
              setShowAddModel(true);
            }}
          >
            添加
          </Button>
          <Button
            type="primary"
            onClick={() => reload()}
          >
            刷新
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading || requestLoading}>
        <Table dataSource={store?.whiteIPs || []} rowKey="id">
          <Table.Column title="序号" dataIndex="id" width={80} />
          <Table.Column
            title="IP地址"
            dataIndex="ip"
            width={200}
            render={(val, record: any) => {
              return (
                <Typography.Text>
                  {val}
                </Typography.Text>
              );
            }}
          />
          <Table.Column
            title="操作"
            width={100}
            dataIndex="action"
            key="action"
            render={(_, record: any) => {
              return (
                <Space>
                  <Popconfirm
                    onConfirm={() => {
                      handleDelete(record.id);
                    }}
                    title={`确定要删除 IP ${record.ip} 吗？`}
                  >
                    <Button type="link" danger>删除</Button>
                  </Popconfirm>
                </Space>
              );
            }}
          />
        </Table>
      </Spin>
      <Modal
        open={showAddModel}
        title={"添加白名单IP"}
        onCancel={() => {
          setShowAddModel(false);
          addForm.resetFields();
        }}
        onOk={() => {
          addForm.validateFields().then(values => {
            handleCreate(values);
          }).catch(err => {
            console.log('验证失败:', err);
          });
        }}
      >
        <Form form={addForm}>
          <Form.Item 
            name="ip" 
            required 
            label="IP地址" 
            labelCol={{ span: 4 }}
            rules={[
              { 
                required: true, 
                message: "请输入IP地址" 
              },
              {
                pattern: /^(\d{1,3}\.){3}\d{1,3}$/, 
                message: '请输入有效的IPv4地址'
              }
            ]}
          >
            <Input placeholder="请输入IP地址，例如：192.168.1.1" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
} 