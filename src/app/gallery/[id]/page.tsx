import { app } from "@/browser/api";

export default async function Page({params,}: {
    params: Promise<{ id: string }>
}) {
    const id = (await params).id
    const { data } = await app.api.gallery({id}).get()
    return <div>My Post: {id} {data}</div>
}
