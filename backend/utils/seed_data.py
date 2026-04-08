from utils.seeds.seed_collectorates import seed_collectorates
from utils.seeds.seed_roles import seed_roles
from utils.seeds.seed_staff import seed_staff
from utils.seeds.seed_licences import seed_licences
from utils.seeds.seed_applicants import seed_applicants
from utils.seeds.seed_applications import seed_applications


def seed_all():
    seed_collectorates()   # first — other tables reference it
    seed_roles()           # second — users need roles
    seed_staff()           # third — officers needed for applications
    seed_licences()        # fourth — licence records needed for applicants
    seed_applicants()      # fifth — users needed for applications
    seed_applications()    # last — needs everything above
    print("✅ All seed data loaded.")