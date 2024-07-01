import {failed, warn, yakitNotify} from "@/utils/notification"
import {CodeScoreSmokingEvaluateResponseProps} from "../plugins/funcTemplateType"
import {RequestYakURLResponse} from "../yakURLTree/data"
import {FileNodeMapProps, FileNodeProps, FileTreeListProps} from "./FileTree/FileTreeType"
import {FileDefault, FileSuffix, FolderDefault} from "./FileTree/icon"
import {StringToUint8Array} from "@/utils/str"
import {
    ConvertYakStaticAnalyzeErrorToMarker,
    IMonacoEditorMarker,
    YakStaticAnalyzeErrorResult
} from "@/utils/editorMarkers"
import {AreaInfoProps, TabFileProps, YakRunnerHistoryProps} from "./YakRunnerType"
import cloneDeep from "lodash/cloneDeep"
import {FileDetailInfo, OptionalFileDetailInfo} from "./RunnerTabs/RunnerTabsType"
import {v4 as uuidv4} from "uuid"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import emiter from "@/utils/eventBus/eventBus"

const {ipcRenderer} = window.require("electron")

const initFileTreeData = (list, path) => {
    return list.Resources.sort((a, b) => {
        // 将 ResourceType 为 'dir' 的对象排在前面
        if (a.ResourceType === "dir" && b.ResourceType !== "dir") {
            return -1 // a排在b前面
        } else if (a.ResourceType !== "dir" && b.ResourceType === "dir") {
            return 1 // b排在a前面
        } else {
            return 0 // 保持原有顺序
        }
    }).map((item) => {
        const isFile = !item.ResourceType
        const isFolder = item.ResourceType === "dir"
        const suffix = isFile && item.ResourceName.indexOf(".") > -1 ? item.ResourceName.split(".").pop() : ""
        const isLeaf = isFile || !item.HaveChildrenNodes
        return {
            parent: path || null,
            name: item.ResourceName,
            path: item.Path,
            isFolder: isFolder,
            icon: isFolder ? FolderDefault : suffix ? FileSuffix[suffix] || FileDefault : FileDefault,
            isLeaf: isLeaf
        }
    })
}

/**
 * @name 文件树获取
 */
export const grpcFetchFileTree: (path: string) => Promise<FileNodeMapProps[]> = (path) => {
    return new Promise(async (resolve, reject) => {
        const params = {
            Method: "GET",
            Url: {Schema: "file", Query: [{Key: "op", Value: "list"}], Path: path}
        }

        try {
            const list: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)
            console.log("文件树", params, list)
            const data: FileNodeMapProps[] = initFileTreeData(list, path)
            resolve(data)
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @name 文件树重命名
 */
export const grpcFetchRenameFileTree: (
    path: string,
    newName: string,
    parentPath: string | null
) => Promise<FileNodeMapProps[]> = (path, newName, parentPath) => {
    return new Promise(async (resolve, reject) => {
        const params = {
            Method: "POST",
            Url: {
                Schema: "file",
                Query: [
                    {Key: "op", Value: "rename"},
                    {
                        Key: "newname",
                        Value: newName
                    }
                ],
                Path: path
            }
        }
        try {
            const list: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)
            console.log("文件树重命名", params, list)
            const data: FileNodeMapProps[] = initFileTreeData(list, parentPath)
            resolve(data)
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @name 文件保存
 */
export const grpcFetchSaveFile: (path: string, code: string) => Promise<FileNodeMapProps[]> = (path, code) => {
    return new Promise(async (resolve, reject) => {
        const params = {
            Method: "POST",
            Url: {
                Schema: "file",
                Query: [{Key: "op", Value: "content"}],
                Path: path
            },
            // Body: []byte(fileContent),
            Body: StringToUint8Array(code)
        }
        try {
            const list: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)
            console.log("文件保存", params, list)
            const data: FileNodeMapProps[] = initFileTreeData(list, path)
            resolve(data)
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @name 新建文件
 */
export const grpcFetchCreateFile: (path: string, code?: string|null, parentPath?: string | null) => Promise<FileNodeMapProps[]> = (path, code,parentPath) => {
    return new Promise(async (resolve, reject) => {
        const params: any = {
            Method: "PUT",
            Url: {
                Schema: "file",
                Query: [{Key: "type", Value: "file"}],
                Path: path
            }
        }
        if (code && code.length > 0) {
            params.Body = StringToUint8Array(code)
        }
        try {
            const list: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)
            console.log("新建文件", params, list)
            const data: FileNodeMapProps[] = initFileTreeData(list, parentPath)
            resolve(data)
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @name 新建文件夹
 */
export const grpcFetchCreateFolder: (path: string, parentPath?: string | null) => Promise<FileNodeMapProps[]> = (path,parentPath) => {
    return new Promise(async (resolve, reject) => {
        const params = {
            Method: "PUT",
            Url: {
                Schema: "file",
                Query: [{Key: "type", Value: "dir"}],
                Path: path
            }
        }
        try {
            const list: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)
            console.log("新建文件夹", params, list)
            const data: FileNodeMapProps[] = initFileTreeData(list, parentPath)
            resolve(data)
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @name 删除文件
 */
export const grpcFetchDeleteFile: (path: string) => Promise<FileNodeMapProps[]> = (path) => {
    return new Promise(async (resolve, reject) => {
        const params = {
            Method: "DELETE",
            Url: {
                Schema: "file",
                Path: path
            }
        }
        try {
            const list: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)
            console.log("删除文件", params, list)
            const data: FileNodeMapProps[] = initFileTreeData(list, path)
            resolve(data)
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * @name 更新树数据里某个节点的children数据
 */
export const updateFileTree: (
    oldFileTree: FileTreeListProps[],
    path: string,
    updateData: FileTreeListProps[]
) => FileTreeListProps[] = (oldFileTree, path, updateData) => {
    if (!path) return oldFileTree

    const isValid = updateData && updateData.length > 0

    return oldFileTree.map((node) => {
        if (node.path === path) {
            return {...node, children: isValid ? updateData : undefined}
        }
        if (node.children && node.children.length > 0) {
            return {
                ...node,
                children: updateFileTree(node.children, path, updateData)
            }
        }
        return node
    })
}

/**
 * @name 语法检查
 */
export const onSyntaxCheck = (code: string) => {
    return new Promise(async (resolve, reject) => {
        // StaticAnalyzeError
        ipcRenderer
            .invoke("StaticAnalyzeError", {Code: StringToUint8Array(code), PluginType: "yak"})
            .then((e: {Result: YakStaticAnalyzeErrorResult[]}) => {
                if (e && e.Result.length > 0) {
                    const markers = e.Result.map(ConvertYakStaticAnalyzeErrorToMarker)
                    // monaco.editor.setModelMarkers(model, "owner", markers)
                    resolve(markers)
                } else {
                    resolve([])
                }
            })
            .catch(() => {
                resolve([])
            })
    })
}

/**
 * @name 判断分栏数据里是否存在某个节点file数据
 */
export const judgeAreaExistFilePath = (areaInfo: AreaInfoProps[], path: string): Promise<FileDetailInfo | null> => {
    return new Promise(async (resolve, reject) => {
        const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
        newAreaInfo.forEach((item, index) => {
            item.elements.forEach((itemIn, indexIn) => {
                itemIn.files.forEach((file, fileIndex) => {
                    if (file.path === path) {
                        resolve(file)
                    }
                })
            })
        })
        resolve(null)
    })
}

/**
 * @name 判断分栏数据里是否存在某些节点file数据
 */
export const judgeAreaExistFilesPath = (areaInfo: AreaInfoProps[], pathArr: string[]): Promise<FileDetailInfo[]> => {
    return new Promise(async (resolve, reject) => {
        const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
        let hasArr: FileDetailInfo[] = []
        newAreaInfo.forEach((item, index) => {
            item.elements.forEach((itemIn, indexIn) => {
                itemIn.files.forEach((file, fileIndex) => {
                    if (pathArr.includes(file.path)) {
                        hasArr.push(file)
                    }
                })
            })
        })
        resolve(hasArr)
    })
}

/**
 * @name 更新分栏数据里某个节点的file数据
 */
// 根据path更新指定内容
export const updateAreaFileInfo = (areaInfo: AreaInfoProps[], data: OptionalFileDetailInfo, path?: string) => {
    const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    newAreaInfo.forEach((item, index) => {
        item.elements.forEach((itemIn, indexIn) => {
            itemIn.files.forEach((file, fileIndex) => {
                if (file.path === path) {
                    newAreaInfo[index].elements[indexIn].files[fileIndex] = {
                        ...newAreaInfo[index].elements[indexIn].files[fileIndex],
                        ...data
                    }
                }
            })
        })
    })
    return newAreaInfo
}

/**
 * @name 更新分栏数据里所选节点的path与parent信息(重命名文件夹导致其内部文件path与parent发生变化)
 */
export const updateAreaFilesPathInfo = (
    areaInfo: AreaInfoProps[],
    path: string[],
    oldPath: string,
    newPath: string
) => {
    const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    newAreaInfo.forEach((item, index) => {
        item.elements.forEach((itemIn, indexIn) => {
            itemIn.files.forEach((file, fileIndex) => {
                if (path.includes(file.path)) {
                    newAreaInfo[index].elements[indexIn].files[fileIndex] = {
                        ...newAreaInfo[index].elements[indexIn].files[fileIndex],
                        path: file.path.replace(oldPath, newPath),
                        parent: file.parent ? file.parent.replace(oldPath, newPath) : null
                    }
                }
            })
        })
    })
    return newAreaInfo
}

/**
 * @name 删除分栏数据里某个节点的file数据
 */
export const removeAreaFileInfo = (areaInfo: AreaInfoProps[], info: FileDetailInfo) => {
    const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    newAreaInfo.forEach((item, idx) => {
        item.elements.forEach((itemIn, idxin) => {
            itemIn.files.forEach((file, fileIndex) => {
                if (file.path === info.path) {
                    // 如若仅存在一项 则删除此大项并更新布局
                    if (item.elements.length > 1 && itemIn.files.length === 1) {
                        newAreaInfo[idx].elements = newAreaInfo[idx].elements.filter(
                            (item) => !item.files.map((item) => item.path).includes(info.path)
                        )
                    } else if (item.elements.length <= 1 && itemIn.files.length === 1) {
                        newAreaInfo.splice(idx, 1)
                    }
                    // 存在多项则只移除删除项
                    else {
                        newAreaInfo[idx].elements[idxin].files = newAreaInfo[idx].elements[idxin].files.filter(
                            (item) => item.path !== info.path
                        )
                        // 重新激活未选中项目（因删除后当前tabs无选中项）
                        if (info.isActive) {
                            newAreaInfo[idx].elements[idxin].files[fileIndex - 1 < 0 ? 0 : fileIndex - 1].isActive =
                                true
                        }
                    }
                }
            })
        })
    })
    return newAreaInfo
}

/**
 * @name 删除分栏数据里多个节点的file数据并重新布局
 */
export const removeAreaFilesInfo = (areaInfo: AreaInfoProps[], removePath: string[]) => {
    // 如若有为空项则删除
    const buildAreaInfo = (areaInfo) => {
        const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
        // 移除elements中的files层
        newAreaInfo.forEach((item, idx) => {
            item.elements.forEach((itemIn, idxin) => {
                if (itemIn.files.length === 0) {
                    newAreaInfo[idx].elements = newAreaInfo[idx].elements.filter((item) => item.id !== itemIn.id)
                }
            })
        })
        // 移除elements层
        let indexArr: number[] = [] // 还有数据的项目
        newAreaInfo.forEach((item, idx) => {
            if (item.elements.length !== 0) {
                indexArr.push(idx)
            }
        })
        let resultAreaInfo: AreaInfoProps[] = []
        indexArr.forEach((index) => {
            resultAreaInfo.push(newAreaInfo[index])
        })
        return resultAreaInfo
    }

    const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    newAreaInfo.forEach((item, idx) => {
        item.elements.forEach((itemIn, idxin) => {
            itemIn.files.forEach((file, fileIndex) => {
                if (removePath.includes(file.path)) {
                    newAreaInfo[idx].elements[idxin].files = itemIn.files.filter((item) => item.path !== file.path)
                }
            })
        })
    })
    return buildAreaInfo(newAreaInfo)
}

/**
 * @name 更改分栏数据里某个节点的isActive活动数据
 */
export const setAreaFileActive = (areaInfo: AreaInfoProps[], path: string) => {
    const newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    newAreaInfo.forEach((item, index) => {
        item.elements.forEach((itemIn, indexIn) => {
            itemIn.files.forEach((file, fileIndex) => {
                if (file.path === path) {
                    newAreaInfo[index].elements[indexIn].files = newAreaInfo[index].elements[indexIn].files.map(
                        (item) => ({...item, isActive: false})
                    )
                    newAreaInfo[index].elements[indexIn].files[fileIndex].isActive = true
                }
            })
        })
    })
    return newAreaInfo
}

/**
 * @name 更改激活展示文件
 */
export const updateActiveFile = (activeFile: FileDetailInfo, data: OptionalFileDetailInfo, path?: string) => {
    let newActiveFile: FileDetailInfo = cloneDeep(activeFile)
    newActiveFile = {...newActiveFile, ...data}
    return newActiveFile
}

/**
 * @name 更改项是否包含激活展示文件，包含则取消激活
 */
export const isResetActiveFile = (
    files: FileDetailInfo[] | FileNodeProps[],
    activeFile: FileDetailInfo | undefined
) => {
    let newActiveFile = activeFile
    files.forEach((file) => {
        if (file.path === activeFile?.path) {
            newActiveFile = undefined
        }
    })
    return newActiveFile
}

/**
 * @name 新增分栏数据里某个节点的file数据
 */
export const addAreaFileInfo = (areaInfo: AreaInfoProps[], info: FileDetailInfo, activeFile?: FileDetailInfo) => {
    let newAreaInfo: AreaInfoProps[] = cloneDeep(areaInfo)
    let newActiveFile: FileDetailInfo = info
    try {
        // 如若存在激活项则向激活项后添加新增项并重新指定激活项目
        if (newAreaInfo.length > 0 && activeFile) {
            newAreaInfo.forEach((item, index) => {
                item.elements.forEach((itemIn, indexIn) => {
                    itemIn.files.forEach((file, fileIndex) => {
                        //
                        if (file.path === activeFile.path) {
                            newAreaInfo[index].elements[indexIn].files = newAreaInfo[index].elements[indexIn].files.map(
                                (item) => ({
                                    ...item,
                                    isActive: false
                                })
                            )
                            newAreaInfo[index].elements[indexIn].files.splice(fileIndex + 1, 0, info)
                        }
                    })
                })
            })
        } else {
            if (newAreaInfo.length === 0) {
                const newElements: TabFileProps[] = [
                    {
                        id: uuidv4(),
                        files: [info]
                    }
                ]
                newAreaInfo = [{elements: newElements}]
            } else {
                newAreaInfo[0].elements[0].files = newAreaInfo[0].elements[0].files.map((item) => ({
                    ...item,
                    isActive: false
                }))
                newAreaInfo[0].elements[0].files = [...newAreaInfo[0].elements[0].files, info]
            }
        }
        return {
            newAreaInfo,
            newActiveFile
        }
    } catch (error) {
        return {
            newAreaInfo,
            newActiveFile
        }
    }
}

/**
 * @name 注入语法检查结果
 */
export const getDefaultActiveFile = async (info: FileDetailInfo) => {
    let newActiveFile = info
    // 注入语法检查结果
    if (newActiveFile.language === "yak") {
        const syntaxCheck = (await onSyntaxCheck(newActiveFile.code)) as IMonacoEditorMarker[]
        if (syntaxCheck) {
            newActiveFile = {...newActiveFile, syntaxCheck}
        }
    }
    return newActiveFile
}

/**
 * @name 获取打开文件的path与name
 */
export const getOpenFileInfo = (): Promise<{path: string; name: string} | null> => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("openDialog", {
                title: "请选择文件",
                properties: ["openFile"]
            })
            .then(async(data: {filePaths: string[]}) => {
                const filesLength = data.filePaths.length
                if (filesLength === 1) {
                    const path: string = data.filePaths[0].replace(/\\/g, "\\")
                    const name: string = await getNameByPath(path)
                    resolve({
                        path,
                        name
                    })
                } else if (filesLength > 1) {
                    warn("只支持单选文件")
                }
                resolve(null)
            })
            .catch(() => {
                reject()
            })
    })
}

/**
 * @name 根据文件path获取其内容
 */
export const getCodeByPath = (path: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("read-file-content", path)
            .then((res) => {
                resolve(res)
            })
            .catch(() => {
                failed("无法获取该文件内容，请检查后后重试！")
                reject()
            })
    })
}

const YakRunnerOpenHistory = "YakRunnerOpenHistory"

/**
 * @name 更改YakRunner历史记录
 */
export const setYakRunnerHistory = (newHistory: YakRunnerHistoryProps) => {
    getRemoteValue(YakRunnerOpenHistory).then((data) => {
        try {
            if (!data) {
                setRemoteValue(YakRunnerOpenHistory, JSON.stringify([newHistory]))
                emiter.emit("onRefreshRunnerHistory", JSON.stringify([newHistory]))
                return
            }
            const historyData: YakRunnerHistoryProps[] = JSON.parse(data)
            const newHistoryData: YakRunnerHistoryProps[] = [
                newHistory,
                ...historyData.filter((item) => item.path !== newHistory.path)
            ].slice(0, 10)
            setRemoteValue(YakRunnerOpenHistory, JSON.stringify(newHistoryData))
            emiter.emit("onRefreshRunnerHistory", JSON.stringify(newHistoryData))
        } catch (error) {}
    })
}

/**
 * @name 获取YakRunner历史记录
 */
export const getYakRunnerHistory = (): Promise<YakRunnerHistoryProps[]> => {
    return new Promise(async (resolve, reject) => {
        getRemoteValue(YakRunnerOpenHistory).then((data) => {
            try {
                if (!data) {
                    resolve([])
                    return
                }
                const historyData: YakRunnerHistoryProps[] = JSON.parse(data)
                resolve(historyData)
            } catch (error) {
                resolve([])
            }
        })
    })
}

/**
 * @name 路径拼接（兼容多系统）
 */
export const getPathJoin = (path:string,file:string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("pathJoin", {
                dir: path,
                file
            })
            .then((currentPath: string) => {
                resolve(currentPath)
            }).catch(()=>{
                resolve("")
            })
    })
}

/**
 * @name 获取上一级的路径（兼容多系统）
 */
export const getPathParent = (filePath:string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("pathParent", {
                filePath
            })
            .then((currentPath: string) => {
                resolve(currentPath)
            }).catch(()=>{
                resolve("")
            })
    })
}

/**
 * @name 获取路径上的(文件/文件夹)名（兼容多系统）
 */
export const getNameByPath  = (filePath:string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("pathFileName", {
                filePath
            })
            .then((currentName: string) => {
                resolve(currentName)
            }).catch(()=>{
                resolve("")
            })
    })
}