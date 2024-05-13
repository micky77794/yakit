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
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {useStore} from "@/store"
import {isEnpriTrace} from "@/utils/envfile"
import {RemoteGV} from "@/yakitGV"
const {ipcRenderer} = window.require("electron")

const RecordOperationHistory = "RecordOperationHistory"

export interface LogItemProps {
    user_name: string
    ip: string
    describe: string
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

    const update = useMemoizedFn((params?: {user_name?: string; ip?: string; describe?: string; time?: number}) => {
        getRemoteValue(RecordOperationHistory).then((data) => {
            console.log("ddd", data)
            if (!data) return
            try {
                let arr: LogItemProps[] = JSON.parse(data)
                if (params) {
                    const {user_name, ip, describe, time} = params
                    if (user_name && user_name.length > 0) {
                        arr = arr.filter((item) => item.user_name.includes(user_name))
                    }
                    if (ip && ip.length > 0) {
                        arr = arr.filter((item) => item.ip.includes(ip))
                    }
                    if (describe && describe.length > 0) {
                        arr = arr.filter((item) => item.describe.includes(describe))
                    }
                }

                console.log("update---", arr)
                setDataSource(arr)
            } catch (error) {}
        })
    })

    useEffect(() => {
        update()
    }, [])

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
                dataIndex: "describe"
            },
            {
                title: "时间",
                dataIndex: "time",
                render: (data) => <>{formatTimestamp(data)}</>
            }
        ]
    }, [])

    const onFinish = useMemoizedFn(() => {
        update()
    })
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
                                                size='small'
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
                                        <div className={styles["opt"]}>
                                            <YakitButton htmlType='submit'>搜索</YakitButton>
                                            <ExportExcel getData={getData} fileName='日志管理' />
                                        </div>
                                    </Form>
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

// 获取私有域地址
const fetchPrivateDomain = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        getRemoteValue(RemoteGV.HttpSetting).then((value: string) => {
            if (value) {
                try {
                    resolve(JSON.parse(value)?.BaseUrl)
                } catch (error) {
                    resolve("")
                }
            }
            resolve("")
        })
    })
}

export interface RecordOperationProps {
    user_name: string
    ip?: string
    describe: string
}

// 监听操作
export const onRecordOperation = async (item: RecordOperationProps) => {
    if (!isEnpriTrace()) return
    let ip = item.ip
    // 如若没有私有域则获取
    if (!ip) {
        ip = await fetchPrivateDomain()
    }
    const newItem: LogItemProps = {...item, time: moment().unix(), ip}
    console.log("useRecordOperation---", newItem)
    getRemoteValue(RemoteGV.HttpSetting).then((data) => {
        if (!data) {
            console.log("chahce", newItem)

            setRemoteValue(RecordOperationHistory, JSON.stringify([newItem]))
        } else {
            try {
                const arr: LogItemProps[] = JSON.parse(data)
                const newArr: LogItemProps[] = [newItem, ...arr]
                console.log("cahce1", newArr)

                setRemoteValue(RecordOperationHistory, JSON.stringify(newArr))
            } catch (error) {}
        }
    })
}
