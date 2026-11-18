from app.seed.rich_demo_seed import seed_rich_demo_command
from app.seed.seed_data import reset_demo_command, seed_demo_command


def register_seed_commands(app):
    app.cli.add_command(seed_demo_command)
    app.cli.add_command(reset_demo_command)
    app.cli.add_command(seed_rich_demo_command)
