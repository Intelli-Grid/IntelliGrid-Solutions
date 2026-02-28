import Header from './Header'
import Footer from './Footer'
import { NudgeProvider } from '../common/NudgeContext'
import UpgradeNudge from '../common/UpgradeNudge'

export default function Layout({ children }) {
    return (
        <NudgeProvider>
            <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
                <UpgradeNudge />
            </div>
        </NudgeProvider>
    )
}
