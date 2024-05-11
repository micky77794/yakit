import React, {useEffect, useMemo, useRef, useState} from "react"
import {Form, Space, Table, Tag, Tooltip} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./logManagement.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {ExportExcel} from "@/components/DataExport/DataExport"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitDatePicker} from "@/components/yakitUI/YakitDatePicker/YakitDatePicker"
import moment from "moment"
import locale from "antd/es/date-picker/locale/zh_CN"
import {formatTimestamp} from "@/utils/timeUtil"
import {PaginationSchema} from "../invoker/schema"
const {ipcRenderer} = window.require("electron")

export interface LogItemProps {
    user_name: string
    ip: string
    operate: string
    time: number
}

export interface LogManagementProps {}
export const LogManagement: React.FC<LogManagementProps> = (props) => {
    const {} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const [dataSource, setDataSource] = useState<LogItemProps[]>([])
    const [pagination, setPagination] = useState<PaginationSchema>({
        Limit: 10,
        Page: 1,
        OrderBy: "updated_at",
        Order: "desc"
    })

    const getData = useMemoizedFn(() => {
        return new Promise((resolve) => {})
    })

    const columns = useMemo(() => {
        return [
            {
                title: "账号",
                dataIndex: "user_name"
            },
            {
                title: "IP",
                dataIndex: "ip"
            },
            {
                title: "操作",
                dataIndex: "operate"
            },
            {
                title: "时间",
                dataIndex: "time",
                render: (data) => <>{formatTimestamp(data)}</>
            }
        ]
    }, [])

    const onFinish = useMemoizedFn(() => {})
    return (
        <div className={styles["log-management"]}>
            <Table
                title={() => {
                    return (
                        <div>
                            <div className={styles["table-header"]}>
                                <div className={styles["title"]}>日志管理</div>
                                <div className={styles["extra"]}>
                                    <Form layout='inline' form={form} onFinish={onFinish}>
                                        <Form.Item label={"账号"} name='user_name'>
                                            <YakitInput placeholder='请输入账号' size='small' />
                                        </Form.Item>
                                        <Form.Item label={"IP"} name='ip'>
                                            <YakitInput placeholder='请输入IP' size='small' />
                                        </Form.Item>
                                        <Form.Item label={"关键字"} name='keyword'>
                                            <YakitInput placeholder='请输入关键字' size='small' />
                                        </Form.Item>
                                        <Form.Item label={"时间"} name='time'>
                                            <YakitDatePicker.RangePicker
                                                size="small"
                                                style={{width: 200}}
                                                locale={locale}
                                                wrapperClassName={styles["operation-range-picker"]}
                                                // onChange={(value) => {
                                                //     if (value) {
                                                //         setParams({
                                                //             ...getParams(),
                                                //             start_time: moment(value[0]).unix(),
                                                //             end_time: moment(value[1]).unix()
                                                //         })
                                                //     } else {
                                                //         setParams({...getParams(), start_time: undefined, end_time: undefined})
                                                //     }
                                                // }}
                                            />
                                        </Form.Item>
                                    </Form>
                                    <div className={styles["opt"]}>
                                        <YakitButton htmlType='submit' >搜索</YakitButton>
                                        <ExportExcel getData={getData} fileName='日志管理' />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }}
                size={"small"}
                bordered={true}
                columns={columns}
                // scroll={{x: "auto"}}
                // rowKey={(e) => e.Id}
                loading={loading}
                dataSource={dataSource}
                pagination={{
                    current: pagination.Page,
                    pageSize: pagination.Limit,
                    showSizeChanger: true,
                    total: dataSource.length,
                    showTotal: (total) => <Tag>Total:{total}</Tag>,
                    pageSizeOptions: ["5", "10", "20"]
                }}
                onChange={(pagination, filters, sorter, extra) => {
                    const {current, pageSize} = pagination
                    console.log("翻页", current, pageSize)
                }}
            />
        </div>
    )
}
