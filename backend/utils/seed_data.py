from utils.seeds.seed_collectorates import seed_collectorates
from utils.seeds.seed_roles import seed_roles
from utils.seeds.seed_staff import seed_staff
from utils.seeds.seed_licences import seed_licences
from utils.seeds.seed_applicants import seed_applicants
from utils.seeds.seed_applications import seed_applications


def seed_all():
    seed_collectorates()
    seed_roles()
    seed_staff()
    seed_licences()
    seed_applicants()
    seed_applications()
    print("✅ All seed data loaded.")