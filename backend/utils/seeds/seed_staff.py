# Seeds officer and supervisor accounts across the three main branches.
from config.extensions import db
from models.user import User
from models.role import Role
from models.user_role import User_role
from models.officer_profile import OfficerProfile
from models.supervisor_profile import SupervisorProfile
from werkzeug.security import generate_password_hash


def seed_staff():
    with db.session.no_autoflush:
        admin_role      = Role.query.filter_by(name="admin").first()
        officer_role    = Role.query.filter_by(name="officer").first()
        supervisor_role = Role.query.filter_by(name="supervisor").first()

        # Admin
        existing_admin = User.query.filter_by(email="admin@taj.gov.jm").first()
        if not existing_admin:
            admin = User(
                email="admin@taj.gov.jm",
                password_hash=generate_password_hash("Admin@1234"),
                is_active=True
            )
            db.session.add(admin)
            db.session.flush()
            db.session.add(User_role(user_id=admin.id, role_id=admin_role.id))
        else:
            existing_admin.password_hash = generate_password_hash("Admin@1234")

        # Officers
        # Each officer is assigned to a specific collectorate branch_code.
        # The pickup collectorate chosen by applicants routes applications to the
        # officer at that collectorate.  Supervisors manage all officers sharing
        # their branch_code.
        officers = [
            # St. Andrew – Constant Spring (021)
            {
                "email": "k.brown@taj.gov.jm",
                "firstname": "Karen", "lastname": "Brown",
                "staff_id": "TAJ-OFF-001", "branch_code": "021",
                "work_phone": "(876) 969-0000",
            },
            # St. Andrew – Cross Roads (022)
            {
                "email": "d.morgan@taj.gov.jm",
                "firstname": "Devon", "lastname": "Morgan",
                "staff_id": "TAJ-OFF-002", "branch_code": "022",
                "work_phone": "(876) 960-0097",
            },
            {
                "email": "t.henry@taj.gov.jm",
                "firstname": "Tracey", "lastname": "Henry",
                "staff_id": "TAJ-OFF-008", "branch_code": "022",
                "work_phone": "(876) 960-0098",
            },
            # St. James – Montego Bay (081)
            {
                "email": "s.williams@taj.gov.jm",
                "firstname": "Stacy", "lastname": "Williams",
                "staff_id": "TAJ-OFF-003", "branch_code": "081",
                "work_phone": "(876) 952-0000",
            },
            {
                "email": "o.reid@taj.gov.jm",
                "firstname": "Omar", "lastname": "Reid",
                "staff_id": "TAJ-OFF-009", "branch_code": "081",
                "work_phone": "(876) 952-0001",
            },
            # Manchester – Mandeville (121)
            {
                "email": "p.sinclair@taj.gov.jm",
                "firstname": "Pamela", "lastname": "Sinclair",
                "staff_id": "TAJ-OFF-004", "branch_code": "121",
                "work_phone": "(876) 962-3920",
            },
            {
                "email": "c.foster@taj.gov.jm",
                "firstname": "Calvin", "lastname": "Foster",
                "staff_id": "TAJ-OFF-010", "branch_code": "121",
                "work_phone": "(876) 962-3921",
            },
            # St. Catherine – Spanish Town (141)
            {
                "email": "n.gordon@taj.gov.jm",
                "firstname": "Nicole", "lastname": "Gordon",
                "staff_id": "TAJ-OFF-005", "branch_code": "141",
                "work_phone": "(876) 984-0000",
            },
            {
                "email": "a.blake@taj.gov.jm",
                "firstname": "Andre", "lastname": "Blake",
                "staff_id": "TAJ-OFF-011", "branch_code": "141",
                "work_phone": "(876) 984-0001",
            },
            # Kingston – King Street (011)
            {
                "email": "l.edwards@taj.gov.jm",
                "firstname": "Lorraine", "lastname": "Edwards",
                "staff_id": "TAJ-OFF-006", "branch_code": "011",
                "work_phone": "(876) 922-7919",
            },
            {
                "email": "m.watson@taj.gov.jm",
                "firstname": "Marcus", "lastname": "Watson",
                "staff_id": "TAJ-OFF-012", "branch_code": "011",
                "work_phone": "(876) 922-7920",
            },
            # 3rd officers per branch
            # St. Andrew – Constant Spring (021)
            {
                "email": "j.morrison@taj.gov.jm",
                "firstname": "Janelle", "lastname": "Morrison",
                "staff_id": "TAJ-OFF-013", "branch_code": "021",
                "work_phone": "(876) 969-0002",
            },
            # St. Andrew – Cross Roads (022)
            {
                "email": "k.clarke@taj.gov.jm",
                "firstname": "Kevin", "lastname": "Clarke",
                "staff_id": "TAJ-OFF-014", "branch_code": "022",
                "work_phone": "(876) 960-0099",
            },
            # St. James – Montego Bay (081)
            {
                "email": "n.white@taj.gov.jm",
                "firstname": "Natasha", "lastname": "White",
                "staff_id": "TAJ-OFF-015", "branch_code": "081",
                "work_phone": "(876) 952-0002",
            },
            # Manchester – Mandeville (121)
            {
                "email": "d.levy@taj.gov.jm",
                "firstname": "Dane", "lastname": "Levy",
                "staff_id": "TAJ-OFF-016", "branch_code": "121",
                "work_phone": "(876) 962-3922",
            },
            # St. Catherine – Spanish Town (141)
            {
                "email": "s.bryan@taj.gov.jm",
                "firstname": "Sharon", "lastname": "Bryan",
                "staff_id": "TAJ-OFF-017", "branch_code": "141",
                "work_phone": "(876) 984-0002",
            },
            # Kingston – King Street (011)
            {
                "email": "r.palmer@taj.gov.jm",
                "firstname": "Ricardo", "lastname": "Palmer",
                "staff_id": "TAJ-OFF-018", "branch_code": "011",
                "work_phone": "(876) 922-7921",
            },
        ]

        for o in officers:
            existing_officer = User.query.filter_by(email=o["email"]).first()
            if existing_officer:
                existing_officer.password_hash = generate_password_hash("Officer@1234")
            else:
                user = User(
                    email=o["email"],
                    password_hash=generate_password_hash("Officer@1234"),
                    is_active=True
                )
                db.session.add(user)
                db.session.flush()
                db.session.add(User_role(user_id=user.id, role_id=officer_role.id))
                db.session.add(OfficerProfile(
                    user_id_fk=user.id,
                    firstname=o["firstname"],
                    lastname=o["lastname"],
                    staff_id=o["staff_id"],
                    department="Driver's Licence Unit",
                    branch_code=o["branch_code"],
                    work_email=o["email"],
                    work_phone=o["work_phone"],
                    is_active_staff=True
                ))

        # Supervisors
        # Each supervisor manages the officers at their branch_code collectorate.
        # Supervisors receive escalated/forwarded applications from officers at
        # the same collectorate.
        supervisors = [
            # St. Andrew area (021 + 022) — one supervisor covers Constant Spring
            {
                "email": "m.taylor@taj.gov.jm",
                "firstname": "Michael", "lastname": "Taylor",
                "staff_id": "TAJ-SUP-001", "branch_code": "021",
                "work_phone": "(876) 969-0000",
            },
            # St. Andrew – Cross Roads (022)
            {
                "email": "j.wilson@taj.gov.jm",
                "firstname": "Janet", "lastname": "Wilson",
                "staff_id": "TAJ-SUP-002", "branch_code": "022",
                "work_phone": "(876) 960-0097",
            },
            # St. James – Montego Bay (081)
            {
                "email": "g.thompson@taj.gov.jm",
                "firstname": "Gary", "lastname": "Thompson",
                "staff_id": "TAJ-SUP-003", "branch_code": "081",
                "work_phone": "(876) 952-0000",
            },
            # Manchester – Mandeville (121)
            {
                "email": "v.miller@taj.gov.jm",
                "firstname": "Veronica", "lastname": "Miller",
                "staff_id": "TAJ-SUP-004", "branch_code": "121",
                "work_phone": "(876) 962-3920",
            },
            # St. Catherine – Spanish Town (141)
            {
                "email": "h.allen@taj.gov.jm",
                "firstname": "Herbert", "lastname": "Allen",
                "staff_id": "TAJ-SUP-005", "branch_code": "141",
                "work_phone": "(876) 984-0000",
            },
            # Kingston – King Street (011)
            {
                "email": "c.james@taj.gov.jm",
                "firstname": "Claudette", "lastname": "James",
                "staff_id": "TAJ-SUP-006", "branch_code": "011",
                "work_phone": "(876) 922-7919",
            },
            # 2nd supervisors per branch
            # St. Andrew – Constant Spring (021)
            {
                "email": "b.grant@taj.gov.jm",
                "firstname": "Beverly", "lastname": "Grant",
                "staff_id": "TAJ-SUP-007", "branch_code": "021",
                "work_phone": "(876) 969-0003",
            },
            # St. Andrew – Cross Roads (022)
            {
                "email": "r.stewart@taj.gov.jm",
                "firstname": "Rohan", "lastname": "Stewart",
                "staff_id": "TAJ-SUP-008", "branch_code": "022",
                "work_phone": "(876) 960-0100",
            },
            # St. James – Montego Bay (081)
            {
                "email": "a.hamilton@taj.gov.jm",
                "firstname": "Andrea", "lastname": "Hamilton",
                "staff_id": "TAJ-SUP-009", "branch_code": "081",
                "work_phone": "(876) 952-0003",
            },
            # Manchester – Mandeville (121)
            {
                "email": "p.thomas@taj.gov.jm",
                "firstname": "Patrick", "lastname": "Thomas",
                "staff_id": "TAJ-SUP-010", "branch_code": "121",
                "work_phone": "(876) 962-3923",
            },
            # St. Catherine – Spanish Town (141)
            {
                "email": "m.cross@taj.gov.jm",
                "firstname": "Marcia", "lastname": "Cross",
                "staff_id": "TAJ-SUP-011", "branch_code": "141",
                "work_phone": "(876) 984-0003",
            },
            # Kingston – King Street (011)
            {
                "email": "d.chin@taj.gov.jm",
                "firstname": "Delroy", "lastname": "Chin",
                "staff_id": "TAJ-SUP-012", "branch_code": "011",
                "work_phone": "(876) 922-7922",
            },
        ]

        for s in supervisors:
            existing_sup = User.query.filter_by(email=s["email"]).first()
            if existing_sup:
                existing_sup.password_hash = generate_password_hash("Super@1234")
            else:
                user = User(
                    email=s["email"],
                    password_hash=generate_password_hash("Super@1234"),
                    is_active=True
                )
                db.session.add(user)
                db.session.flush()
                db.session.add(User_role(user_id=user.id, role_id=supervisor_role.id))
                db.session.add(SupervisorProfile(
                    user_id_fk=user.id,
                    firstname=s["firstname"],
                    lastname=s["lastname"],
                    staff_id=s["staff_id"],
                    department="Driver's Licence Unit",
                    branch_code=s["branch_code"],
                    work_email=s["email"],
                    work_phone=s["work_phone"],
                    is_active_staff=True
                ))

    db.session.commit()
    print("Staff seeded.")
    print()
    print("  ADMIN")
    print("   admin@taj.gov.jm            / Admin@1234")
    print()
    print("  OFFICERS  (password: Officer@1234)  [capacity limit: 8 active cases each]")
    print("   k.brown@taj.gov.jm      TAJ-OFF-001  branch 021 (St. Andrew – Constant Spring)")
    print("   j.morrison@taj.gov.jm   TAJ-OFF-013  branch 021")
    print("   d.morgan@taj.gov.jm     TAJ-OFF-002  branch 022 (St. Andrew – Cross Roads)")
    print("   t.henry@taj.gov.jm      TAJ-OFF-008  branch 022")
    print("   k.clarke@taj.gov.jm     TAJ-OFF-014  branch 022")
    print("   s.williams@taj.gov.jm   TAJ-OFF-003  branch 081 (St. James – Montego Bay)")
    print("   o.reid@taj.gov.jm       TAJ-OFF-009  branch 081")
    print("   n.white@taj.gov.jm      TAJ-OFF-015  branch 081")
    print("   p.sinclair@taj.gov.jm   TAJ-OFF-004  branch 121 (Manchester – Mandeville)")
    print("   c.foster@taj.gov.jm     TAJ-OFF-010  branch 121")
    print("   d.levy@taj.gov.jm       TAJ-OFF-016  branch 121")
    print("   n.gordon@taj.gov.jm     TAJ-OFF-005  branch 141 (St. Catherine – Spanish Town)")
    print("   a.blake@taj.gov.jm      TAJ-OFF-011  branch 141")
    print("   s.bryan@taj.gov.jm      TAJ-OFF-017  branch 141")
    print("   l.edwards@taj.gov.jm    TAJ-OFF-006  branch 011 (Kingston – King Street)")
    print("   m.watson@taj.gov.jm     TAJ-OFF-012  branch 011")
    print("   r.palmer@taj.gov.jm     TAJ-OFF-018  branch 011")
    print()
    print("  SUPERVISORS  (password: Super@1234)  [2 per branch, all share same collectorate pool]")
    print("   m.taylor@taj.gov.jm     TAJ-SUP-001  branch 021")
    print("   b.grant@taj.gov.jm      TAJ-SUP-007  branch 021")
    print("   j.wilson@taj.gov.jm     TAJ-SUP-002  branch 022")
    print("   r.stewart@taj.gov.jm    TAJ-SUP-008  branch 022")
    print("   g.thompson@taj.gov.jm   TAJ-SUP-003  branch 081")
    print("   a.hamilton@taj.gov.jm   TAJ-SUP-009  branch 081")
    print("   v.miller@taj.gov.jm     TAJ-SUP-004  branch 121")
    print("   p.thomas@taj.gov.jm     TAJ-SUP-010  branch 121")
    print("   h.allen@taj.gov.jm      TAJ-SUP-005  branch 141")
    print("   m.cross@taj.gov.jm      TAJ-SUP-011  branch 141")
    print("   c.james@taj.gov.jm      TAJ-SUP-006  branch 011")
    print("   d.chin@taj.gov.jm       TAJ-SUP-012  branch 011")
