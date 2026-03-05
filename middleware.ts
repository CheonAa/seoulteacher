import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const role = req.nextauth.token?.role;
        const path = req.nextUrl.pathname;

        // Owner 영역
        if (path.startsWith("/owner") && role !== "OWNER") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        // Admin 강사 관리 영역 (Owner 전용)
        if (path.startsWith("/admin/instructors") && role !== "OWNER") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        // Admin 공통 영역 (Owner, Admin, Instructor 접근 가능 - 데이터 필터링은 서버 컴포넌트 내부에서 처리)
        if (path.startsWith("/admin") && role !== "ADMIN" && role !== "OWNER" && role !== "INSTRUCTOR") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        // Instructor 영역 (Owner도 접근 가능)
        if (path.startsWith("/instructor") && role !== "INSTRUCTOR" && role !== "OWNER") {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
        pages: {
            signIn: "/login",
        }
    }
);

export const config = {
    matcher: ["/admin/:path*", "/owner/:path*", "/instructor/:path*", "/dashboard/:path*"],
};
