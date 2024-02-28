import React, {useEffect, useMemo, useState} from "react"
import {PluginDetailHeader, PluginDetails, PluginDetailsListItem} from "../baseTemplate"
import {
    OutlineClouduploadIcon,
    OutlineDotshorizontalIcon,
    OutlineExportIcon,
    OutlineLogoutIcon,
    OutlinePencilaltIcon,
    OutlinePluscircleIcon,
    OutlineTerminalIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useMemoizedFn} from "ahooks"
import {Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakScript} from "@/pages/invoker/schema"
import {FilterPopoverBtn, FuncFilterPopover} from "../funcTemplate"
import {PluginGroup, TagsAndGroupRender, YakFilterRemoteObj} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import cloneDeep from "lodash/cloneDeep"
import {PluginFilterParams, PluginSearchParams} from "../baseTemplateType"
import {PluginDetailsTabProps, PluginsLocalDetailProps, RemoveMenuModalContentProps} from "./PluginsLocalType"
import {yakitNotify} from "@/utils/notification"
import {YakitPluginOnlineJournal} from "@/pages/yakitStore/YakitPluginOnlineJournal/YakitPluginOnlineJournal"
import {executeYakScriptByParams} from "@/pages/invoker/YakScriptCreator"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {AddToMenuActionForm, LocalPluginExecutor} from "@/pages/yakitStore/PluginOperator"
import {isCommunityEdition} from "@/utils/envfile"
import {CodeGV} from "@/yakitGV"
import {getRemoteValue} from "@/utils/kv"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {LoadingOutlined} from "@ant-design/icons"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/routes/newRoute"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon} from "@/assets/icon/colors"
import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import {LocalPluginExecute} from "./LocalPluginExecute"
import "../plugins.scss"
import styles from "./PluginsLocalDetail.module.scss"
import {onToEditPlugin} from "../utils"
import classNames from "classnames"
import {API} from "@/services/swagger/resposeType"

const {ipcRenderer} = window.require("electron")

const {TabPane} = PluginTabs

export const PluginsLocalDetail: React.FC<PluginsLocalDetailProps> = (props) => {
    const {
        pageWrapId = "",
        info,
        defaultAllCheck,
        // onCheck,
        defaultSelectList,
        // optCheck,
        response,
        onBack,
        loadMoreData,
        loading,
        defaultSearchValue,
        defaultFilter,
        dispatch,
        onRemovePluginDetailSingleBefore,
        onDetailExport,
        onDetailSearch,
        spinLoading,
        // onDetailsBatchRemove,
        onDetailsBatchUpload,
        onDetailsBatchSingle,
        currentIndex,
        setCurrentIndex,
        removeLoading,
        onJumpToLocalPluginDetailByUUID,
        uploadLoading,
        privateDomain
    } = props
    const [executorShow, setExecutorShow] = useState<boolean>(true)
    const [selectGroup, setSelectGroup] = useState<YakFilterRemoteObj[]>(() => {
        const group: YakFilterRemoteObj[] = cloneDeep(defaultFilter).plugin_group?.map(
            (item: API.PluginsSearchData) => ({
                name: item.value,
                total: item.count
            })
        )
        return group || []
    })
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearchValue))
    const [selectList, setSelectList] = useState<YakScript[]>(defaultSelectList)
    const [allCheck, setAllCheck] = useState<boolean>(defaultAllCheck)

    const [filters, setFilters] = useState<PluginFilterParams>(() => {
        const relFilter: PluginFilterParams = cloneDeep(defaultFilter)
        delete relFilter.plugin_group
        return relFilter
    })

    const [plugin, setPlugin] = useState<YakScript>()
    // 因为组件 RollingLoadList 的定向滚动功能初始不执行，所以设置一个初始变量跳过初始状态
    const [scrollTo, setScrollTo] = useState<number>(0)

    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.Total
        else return selectList.length
    }, [allCheck, selectList])

    useEffect(() => {
        if (info) {
            setPlugin({...info})
            setExecutorShow(false)
            // 必须加上延时，不然本次操作会成为组件(RollingLoadList)的初始数据
            setTimeout(() => {
                setScrollTo(currentIndex)
                setExecutorShow(true)
            }, 100)
        } else setPlugin(undefined)
    }, [info])

    useEffect(() => {
        emiter.on("onRefLocalDetailSelectPlugin", onJumpToLocalPluginDetailByUUID)
        return () => {
            emiter.off("onRefLocalDetailSelectPlugin", onJumpToLocalPluginDetailByUUID)
        }
    }, [])

    // 返回
    const onPluginBack = useMemoizedFn(() => {
        onBack({
            search,
            filter: getRealFilters(filters, {group: selectGroup}),
            selectList,
            allCheck
        })
        setPlugin(undefined)
    })
    const onRemove = useMemoizedFn(() => {
        if (!plugin || removeLoading) return
        onRemovePluginDetailSingleBefore(plugin)
    })
    const onExport = useMemoizedFn(() => {
        if (!plugin) return
        onDetailExport([plugin.Id], () => {
            onCheck(false)
        })
    })
    /** 新建插件 */
    const onNewAddPlugin = useMemoizedFn(() => {
        emiter.emit(
            "openPage",
            JSON.stringify({route: YakitRoute.AddYakitScript, params: {source: YakitRoute.Plugin_Local}})
        )
    })
    const onEdit = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!plugin) return
        onToEditPlugin(plugin)
    })
    const onUpload = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!plugin) return
        onDetailsBatchSingle(plugin)
    })
    const onPluginClick = useMemoizedFn((data: YakScript, index: number) => {
        setCurrentIndex(index)
        setPlugin({...data})
        if (data.ScriptName !== plugin?.ScriptName) {
            setExecutorShow(false)
            setTimeout(() => {
                setExecutorShow(true)
            }, 200)
        }
    })
    /** 单项勾选|取消勾选 */
    const optCheck = useMemoizedFn((data: YakScript, value: boolean) => {
        try {
            // 全选情况时的取消勾选
            if (allCheck) {
                setSelectList(response.Data.filter((item) => item.ScriptName !== data.ScriptName))
                setAllCheck(false)
                return
            }
            // 单项勾选回调
            if (value) setSelectList([...selectList, data])
            else setSelectList(selectList.filter((item) => item.ScriptName !== data.ScriptName))
        } catch (error) {
            yakitNotify("error", "勾选失败:" + error)
        }
    })
    /**全选 */
    const onCheck = useMemoizedFn((value: boolean) => {
        setSelectList([])
        setAllCheck(value)
    })
    const checkList = useMemo(() => {
        return selectList.map((ele) => ele.ScriptName)
    }, [selectList])
    const onMenuSelect = useMemoizedFn(({key}) => {
        switch (key) {
            case "share":
                onExport()
                break
            case "local-debugging":
                onLocalDebugging()
                break
            case "add-to-menu":
                onAddToMenu()
                break
            case "remove-menu":
                onRemoveMenu()
                break
            case "remove-plugin":
                onRemove()
                break
            default:
                break
        }
    })
    /**调试 */
    const onLocalDebugging = useMemoizedFn(() => {
        if (!plugin) return
        executeYakScriptByParams(plugin, true)
    })
    /**添加到菜单栏 */
    const onAddToMenu = useMemoizedFn(() => {
        if (!plugin) return
        const m = showYakitModal({
            title: `添加到菜单栏中[${plugin.Id}]`,
            content: <AddToMenuActionForm visible={true} setVisible={() => m.destroy()} script={plugin} />,
            onCancel: () => {
                m.destroy()
            },
            footer: null
        })
    })
    /**移出菜单 移出前需要先判断该插件是否有一级菜单 */
    const onRemoveMenu = useMemoizedFn(() => {
        if (!plugin) return
        getRemoteValue("PatternMenu").then((patternMenu) => {
            const menuMode = patternMenu || "expert"
            ipcRenderer
                .invoke("QueryNavigationGroups", {
                    YakScriptName: plugin.ScriptName,
                    Mode: isCommunityEdition() ? CodeGV.PublicMenuModeValue : menuMode
                })
                .then((data: {Groups: string[]}) => {
                    const list = data.Groups || []
                    if (list.length === 0) {
                        yakitNotify("info", "该插件暂未添加到菜单栏")
                    } else {
                        const m = showYakitModal({
                            title: "移除菜单栏",
                            content: (
                                <RemoveMenuModalContent pluginName={plugin.ScriptName} onCancel={() => m.destroy()} />
                            ),
                            onCancel: () => {
                                m.destroy()
                            },
                            footer: null
                        })
                    }
                })
                .catch((e: any) => {
                    yakitNotify("error", "获取菜单失败：" + e)
                })
        })
    })
    /**获取传到接口所需的filters*/
    const getRealFilters = (filter: PluginFilterParams, extra: {group: YakFilterRemoteObj[]}) => {
        const realFilters: PluginFilterParams = {
            ...filter,
            plugin_group: extra.group.map((item) => ({value: item.name, count: item.total, label: item.name}))
        }
        return realFilters
    }
    /** 插件组查询 */
    const onGroupSearch = useMemoizedFn((group: YakFilterRemoteObj[]) => {
        setSelectGroup(group)
        onDetailSearch(search, getRealFilters(filters, {group}))
        setAllCheck(false)
        setSelectList([])
    })
    const onFilter = useMemoizedFn((value: PluginFilterParams) => {
        setFilters(value)
        onDetailSearch(search, getRealFilters(value, {group: selectGroup}))
        setAllCheck(false)
        setSelectList([])
    })
    /**搜索需要清空勾选 */
    const onSearch = useMemoizedFn(() => {
        onDetailSearch(search, getRealFilters(filters, {group: selectGroup}))
        setAllCheck(false)
        setSelectList([])
    })
    /**详情批量删除 */
    // const onBatchRemove = useMemoizedFn(async () => {
    //     const params: PluginLocalDetailBackProps = {allCheck, selectList, search, filter: filters, selectNum}
    //     onDetailsBatchRemove(params)
    //     setAllCheck(false)
    //     setSelectList([])
    // })
    /**详情批量上传 */
    const onBatchUpload = useMemoizedFn(() => {
        if (selectList.length === 0) {
            yakitNotify("error", "请先勾选数据")
            return
        }
        const names = selectList.map((ele) => ele.ScriptName)
        onDetailsBatchUpload(names)
    })
    /** 单项副标题组件 */
    const optExtra = useMemoizedFn((data: YakScript) => {
        if (privateDomain !== data.OnlineBaseUrl) return <></>
        if (data.OnlineIsPrivate) {
            return <SolidPrivatepluginIcon className='icon-svg-16' />
        } else {
            return <SolidCloudpluginIcon className='icon-svg-16' />
        }
    })
    const isShowUpload: boolean = useMemo(() => {
        if (plugin?.IsCorePlugin) return false
        return !!plugin?.isLocalPlugin
    }, [plugin?.isLocalPlugin, plugin?.IsCorePlugin])
    const headExtraNode = useMemo(() => {
        return (
            <>
                <div className={styles["plugin-info-extra-header"]}>
                    <YakitButton type='text2' icon={<OutlinePencilaltIcon onClick={onEdit} />} />
                    <div className='divider-style' />
                    <FuncFilterPopover
                        icon={<OutlineDotshorizontalIcon />}
                        menu={{
                            type: "primary",
                            data: [
                                {
                                    key: "share",
                                    label: "导出",
                                    itemIcon: <OutlineExportIcon className={styles["plugin-local-extra-node-icon"]} />
                                },
                                {
                                    key: "add-to-menu",
                                    label: "添加到菜单栏",
                                    itemIcon: (
                                        <OutlinePluscircleIcon className={styles["plugin-local-extra-node-icon"]} />
                                    )
                                },
                                {
                                    key: "remove-menu",
                                    itemIcon: <OutlineLogoutIcon className={styles["plugin-local-extra-node-icon"]} />,
                                    label: "移出菜单栏"
                                },
                                {type: "divider"},
                                {
                                    key: "remove-plugin",
                                    itemIcon: <OutlineTrashIcon className={styles["plugin-local-extra-node-icon"]} />,
                                    label: "删除插件",
                                    type: "danger"
                                }
                            ],
                            className: styles["func-filter-dropdown-menu"],
                            onClick: onMenuSelect
                        }}
                        button={{type: "text2"}}
                        placement='bottomRight'
                    />
                    {isShowUpload && (
                        <>
                            <YakitButton
                                icon={<OutlineClouduploadIcon />}
                                onClick={onUpload}
                                className={styles["cloud-upload-icon"]}
                                loading={uploadLoading}
                            >
                                上传
                            </YakitButton>
                        </>
                    )}
                </div>
            </>
        )
    }, [removeLoading, isShowUpload])
    if (!plugin) return null
    return (
        <>
            <PluginDetails<YakScript>
                pageWrapId={pageWrapId}
                title='本地插件'
                filterNode={
                    <>
                        <PluginGroup selectGroup={selectGroup} setSelectGroup={onGroupSearch} />
                        <TagsAndGroupRender selectGroup={selectGroup} setSelectGroup={onGroupSearch} />
                    </>
                }
                filterExtra={
                    <div className={"details-filter-extra-wrapper"}>
                        <FilterPopoverBtn defaultFilter={filters} onFilter={onFilter} type='local' />
                        <div style={{height: 12}} className='divider-style'></div>
                        <Tooltip title='上传插件' overlayClassName='plugins-tooltip'>
                            <YakitButton
                                type='text2'
                                disabled={allCheck || selectList.length === 0}
                                icon={<OutlineClouduploadIcon />}
                                onClick={onBatchUpload}
                            />
                        </Tooltip>
                        {/* <div style={{height: 12}} className='divider-style'></div> */}
                        {/* {removeLoading ? (
                            <YakitButton type='text2' icon={<LoadingOutlined />} />
                        ) : (
                            <Tooltip title='删除插件' overlayClassName='plugins-tooltip'>
                                <YakitButton type='text2' icon={<OutlineTrashIcon />} onClick={onBatchRemove} />
                            </Tooltip>
                        )} */}
                        <div style={{height: 12}} className='divider-style'></div>
                        <YakitButton type='text' onClick={onNewAddPlugin}>
                            新建插件
                        </YakitButton>
                    </div>
                }
                checked={allCheck}
                onCheck={onCheck}
                total={response.Total}
                selected={selectNum}
                listProps={{
                    rowKey: "ScriptName",
                    numberRoll: scrollTo,
                    data: response.Data,
                    loadMoreData: loadMoreData,
                    classNameRow: "plugin-details-opt-wrapper",
                    renderRow: (info, i) => {
                        const check = allCheck || checkList.includes(info.ScriptName)
                        return (
                            <PluginDetailsListItem<YakScript>
                                order={i}
                                plugin={info}
                                selectUUId={plugin.ScriptName} //本地用的ScriptName代替uuid
                                check={check}
                                headImg={info.HeadImg || ""}
                                pluginUUId={info.ScriptName} //本地用的ScriptName代替uuid
                                pluginName={info.ScriptName}
                                help={info.Help}
                                content={info.Content}
                                optCheck={optCheck}
                                official={!!info.OnlineOfficial}
                                isCorePlugin={!!info.IsCorePlugin}
                                pluginType={info.Type}
                                onPluginClick={onPluginClick}
                                extra={optExtra}
                            />
                        )
                    },
                    page: response.Pagination.Page,
                    hasMore: +response.Total !== response.Data.length,
                    loading: loading,
                    defItemHeight: 46,
                    isRef: spinLoading
                }}
                onBack={onPluginBack}
                search={search}
                setSearch={setSearch}
                onSearch={onSearch}
                // spinLoading={spinLoading || removeLoading}
                spinLoading={spinLoading}
            >
                <PluginDetailsTab executorShow={executorShow} plugin={plugin} headExtraNode={headExtraNode} />
            </PluginDetails>
        </>
    )
}

export const PluginDetailsTab: React.FC<PluginDetailsTabProps> = React.memo((props) => {
    const {executorShow, plugin, headExtraNode, wrapperClassName = "", hiddenLogIssue} = props
    return (
        <div className={classNames(styles["details-content-wrapper"], wrapperClassName)}>
            <PluginTabs defaultActiveKey='execute' tabPosition='right'>
                <TabPane tab='执行' key='execute'>
                    <div className={styles["plugin-execute-wrapper"]}>
                        {executorShow ? (
                            <LocalPluginExecute plugin={plugin} headExtraNode={headExtraNode} />
                        ) : (
                            <YakitSpin wrapperClassName={styles["plugin-execute-spin"]} />
                        )}
                    </div>
                </TabPane>
                <TabPane tab='源码' key='code'>
                    <div className={styles["plugin-info-wrapper"]}>
                        <PluginDetailHeader
                            pluginName={plugin.ScriptName}
                            help={plugin.Help}
                            tags={plugin.Tags}
                            extraNode={headExtraNode}
                            img={plugin.HeadImg || ""}
                            user={plugin.Author}
                            pluginId={plugin.UUID}
                            updated_at={plugin.UpdatedAt || 0}
                            prImgs={(plugin.CollaboratorInfo || []).map((ele) => ({
                                headImg: ele.HeadImg,
                                userName: ele.UserName
                            }))}
                            type={plugin.Type}
                        />
                        <div className={styles["details-editor-wrapper"]}>
                            <YakitEditor type={plugin.Type} value={plugin.Content} readOnly={true} />
                        </div>
                    </div>
                </TabPane>
                {!hiddenLogIssue && (
                    <TabPane tab='日志' key='log'>
                        <div className={styles["plugin-log-wrapper"]}>
                            <YakitPluginOnlineJournal pluginId={+plugin.OnlineId} />
                        </div>
                    </TabPane>
                )}
                {!hiddenLogIssue && (
                    <TabPane tab='问题反馈' key='feedback' disabled={true}>
                        <div>问题反馈</div>
                    </TabPane>
                )}
            </PluginTabs>
        </div>
    )
})

const RemoveMenuModalContent: React.FC<RemoveMenuModalContentProps> = React.memo((props) => {
    const {pluginName, onCancel} = props
    const [groups, setGroups] = useState<string[]>([])
    const [patternMenu, setPatternMenu] = useState<"expert" | "new">("expert")
    useEffect(() => {
        updateGroups()
    }, [])
    const updateGroups = () => {
        getRemoteValue("PatternMenu").then((patternMenu) => {
            const menuMode = patternMenu || "expert"
            setPatternMenu(menuMode)
            if (!pluginName) return
            ipcRenderer
                .invoke("QueryNavigationGroups", {
                    YakScriptName: pluginName,
                    Mode: isCommunityEdition() ? CodeGV.PublicMenuModeValue : menuMode
                })
                .then((data: {Groups: string[]}) => {
                    const list = data.Groups || []
                    if (list.length === 0) {
                        onCancel()
                    }
                    setGroups(list)
                })
                .catch((e: any) => {
                    yakitNotify("error", "获取菜单失败：" + e)
                })
                .finally()
        })
    }
    const onClickRemove = useMemoizedFn((element: string) => {
        ipcRenderer
            .invoke("DeleteAllNavigation", {
                YakScriptName: pluginName,
                Group: element,
                Mode: isCommunityEdition() ? CodeGV.PublicMenuModeValue : patternMenu
            })
            .then(() => {
                if (isCommunityEdition()) ipcRenderer.invoke("refresh-public-menu")
                else ipcRenderer.invoke("change-main-menu")
                updateGroups()
            })
            .catch((e: any) => {
                yakitNotify("error", "移除菜单失败：" + e)
            })
    })
    return (
        <div className={styles["remove-menu-body"]}>
            {groups.map((element) => {
                return (
                    <YakitButton type='outline2' key={element} onClick={() => onClickRemove(element)}>
                        从 {element} 中移除
                    </YakitButton>
                )
            }) || "暂无数据"}
        </div>
    )
})
